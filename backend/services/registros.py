"""Registros del workspace: presupuesto, reuniones y, para Ingeniería,
servicios.

Todas son la misma operación (listar, crear, editar, borrar filas de
una tabla, casi siempre acotadas a un departamento) sobre esquemas distintos.
En vez de escribir un CRUD idéntico por entidad, cada una se describe con una
`Tabla` y comparte estas funciones.

Deliberadamente NO es un almacén genérico tipo clave/valor: cada tabla tiene
sus columnas y sus tipos de verdad, con sus CHECK y sus índices, porque un
importe tiene que ser NUMERIC y una fecha DATE. Lo que se comparte es el
fontanería del CRUD, no el esquema.
"""

from dataclasses import dataclass
from decimal import Decimal

import psycopg2
from psycopg2.extras import Json, RealDictCursor

from backend.config import DATABASE_URL
from backend.services import historial
from backend.services.db import PERSONAS, fijar_personas, id_de_persona


def _get_connection():
    return psycopg2.connect(DATABASE_URL)


@dataclass(frozen=True)
class Tabla:
    """Una entidad del workspace.

    `columnas` son las que se pueden escribir desde la API, como campo de la
    API -> columna de la tabla: nunca se interpolan valores de usuario en el
    SQL, solo estos nombres, que son literales del código. Se lee de la vista
    `<nombre>_v`, que habla como la API (por eso `orden` usa sus nombres).
    """

    nombre: str
    columnas: dict[str, str]
    orden: str
    # Columnas JSONB: un `list` de Python se adaptaría a ARRAY, así que van
    # envueltas en `Json` al escribir.
    json: tuple[str, ...] = ()
    # Además de las del departamento, enseña las del club (`department = ''`):
    # la reunión semanal de todos no es de ningún departamento.
    incluye_club: bool = False
    # Borrar manda a la papelera (30 días, ver `services/historial.py`) en vez
    # de quitar la fila: `entidad` es como se llama allí.
    papelera: str = ""


PRESUPUESTO = Tabla(
    nombre="budget_lines",
    columnas={
        "concepto": "item", "tipo": "kind", "importe": "amount", "estado": "status",
        "fecha": "date", "notas": "notes",
    },
    orden="COALESCE(fecha, created_at::date) DESC, id DESC",
)

REUNIONES = Tabla(
    nombre="meetings",
    columnas={
        "titulo": "title", "fecha": "date", "hora": "start_time", "objetivo": "goal",
        "asistentes": "asistentes", "contenido": "content",
    },
    orden="fecha DESC, hora DESC, id DESC",
    json=("contenido",),
    incluye_club=True,
    papelera="reunion",
)

SERVICIOS = Tabla(
    nombre="services",
    columnas={
        "nombre": "name", "tipo": "kind", "url": "url", "responsables": "responsables",
        "renovacion": "renewal_date", "estado": "status", "notas": "notes",
        "visible_club": "visible_to_club",
    },
    orden="nombre",
)

PRESUPUESTO_TIPOS = ("gasto", "ingreso")
PRESUPUESTO_ESTADOS = ("previsto", "aprobado", "pagado", "cancelado")
SERVICIO_TIPOS = (
    "alojamiento", "base_datos", "dominio", "correo", "codigo", "mensajeria", "otro",
)
SERVICIO_ESTADOS = ("activo", "pendiente", "baja")


def _serializar(fila: dict) -> dict:
    salida = dict(fila)
    for clave, valor in salida.items():
        if isinstance(valor, Decimal):
            # Como texto: json.dumps convertiría Decimal a float y un
            # presupuesto perdería exactitud en el viaje.
            salida[clave] = str(valor)
        elif hasattr(valor, "isoformat"):
            salida[clave] = valor.isoformat()
    return salida


def _alcance(tabla: Tabla, departamento: str | None, sobre_tabla: bool = True) -> tuple[str, list]:
    """Cláusula y parámetros que acotan una fila a su departamento. Sobre la
    tabla (escrituras) también deja fuera lo que está en la papelera; la vista
    `_v` con la que se lee ya lo deja fuera, y su columna se llama como en la
    API."""
    sin_borrar = " AND deleted_at IS NULL" if tabla.papelera and sobre_tabla else ""
    columna = "department" if sobre_tabla else "departamento"
    if tabla.incluye_club:
        return f" AND {columna} IN (%s, ''){sin_borrar}", [departamento]
    return f" AND {columna} = %s{sin_borrar}", [departamento]


def _adaptar(tabla: Tabla, campos: dict) -> dict:
    return {c: Json(v) if c in tabla.json else v for c, v in campos.items()}


def listar(tabla: Tabla, departamento: str | None = None) -> list[dict]:
    donde, valores = _alcance(tabla, departamento, sobre_tabla=False)
    with _get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                f"SELECT * FROM {tabla.nombre}_v WHERE TRUE{donde}"
                f" ORDER BY {tabla.orden}",
                valores,
            )
            return [_serializar(f) for f in cur.fetchall()]


def crear(tabla: Tabla, campos: dict, creado_por: str, departamento: str | None = None) -> dict:
    campo_personas = _campo_personas(tabla)
    campos = _adaptar(tabla, campos)
    claves = [c for c in tabla.columnas if c in campos and c != campo_personas]
    valores = [campos[c] for c in claves]
    columnas = [tabla.columnas[c] for c in claves]

    columnas.append("department")
    valores.append(departamento)

    marcadores = ", ".join(["%s"] * len(columnas))
    with _get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            columnas.append("created_by_id")
            valores.append(id_de_persona(cur, creado_por))
            cur.execute(
                f"INSERT INTO {tabla.nombre} ({', '.join(columnas)})"
                f" VALUES ({marcadores}, %s) RETURNING id",
                valores,
            )
            nueva_id = cur.fetchone()["id"]
            if campo_personas:
                fijar_personas(cur, tabla.nombre, nueva_id, campos.get(campo_personas, []))
            cur.execute(f"SELECT * FROM {tabla.nombre}_v WHERE id = %s", (nueva_id,))
            fila = cur.fetchone()
            if tabla.papelera:
                historial.registrar(cur, tabla.papelera, nueva_id, "crear", fila["titulo"], creado_por)
        conn.commit()
    return _serializar(fila)


def _campo_personas(tabla: Tabla) -> str | None:
    """Nombre del campo de personas de la tabla (asistentes, responsables), que
    no es una columna: va a su tabla aparte (ver services/db.py)."""
    return PERSONAS[tabla.nombre][2] if tabla.nombre in PERSONAS else None


def actualizar(
    tabla: Tabla, fila_id: int, campos: dict, departamento: str | None = None
) -> bool:
    """El departamento va en el WHERE del propio UPDATE: pasar el id de una
    fila de otro departamento no actualiza nada, sin SELECT previo."""
    campo_personas = _campo_personas(tabla)
    personas = campos.get(campo_personas) if campo_personas else None
    campos = _adaptar(tabla, campos)
    claves = [c for c in tabla.columnas if c in campos and c != campo_personas]
    asignaciones = [f"{tabla.columnas[c]} = %s" for c in claves]
    valores = [campos[c] for c in claves]
    if not asignaciones and personas is None:
        return False

    asignaciones.append("updated_at = NOW()")
    donde, valores_alcance = _alcance(tabla, departamento)

    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE {tabla.nombre} SET {', '.join(asignaciones)}"
                f" WHERE id = %s{donde}",
                [*valores, fila_id, *valores_alcance],
            )
            actualizado = cur.rowcount > 0
            if actualizado and personas is not None:
                fijar_personas(cur, tabla.nombre, fila_id, personas)
        conn.commit()
    return actualizado


def eliminar(
    tabla: Tabla, fila_id: int, departamento: str | None = None, autor: str = ""
) -> bool:
    donde, valores = _alcance(tabla, departamento)
    with _get_connection() as conn:
        if tabla.papelera:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                enviado = historial.mandar_a_papelera(
                    cur, tabla.papelera, fila_id, donde.removeprefix(" AND "), valores, autor
                )
            conn.commit()
            return enviado is not None
        with conn.cursor() as cur:
            cur.execute(
                f"DELETE FROM {tabla.nombre} WHERE id = %s{donde}",
                [fila_id, *valores],
            )
            eliminado = cur.rowcount > 0
        conn.commit()
    return eliminado


def accesos_club() -> list[dict]:
    """Los servicios que Ingeniería ha marcado como acceso para todo el club,
    con su enlace: lo único que sale de esta tabla fuera de Ingeniería."""
    with _get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT id, name AS nombre, kind AS tipo, url, notes AS notas FROM services"
                " WHERE visible_to_club AND url <> '' AND status <> 'baja'"
                " ORDER BY name"
            )
            return [dict(f) for f in cur.fetchall()]


def resumen_presupuesto(departamento: str) -> dict:
    """Totales del presupuesto, sumados en SQL para que sigan siendo exactos.

    Lo cancelado no cuenta en ningún total: sigue en la lista como registro de
    que se descartó, pero sumarlo daría un presupuesto que nadie va a gastar.
    """
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    COALESCE(SUM(amount) FILTER (WHERE kind = 'gasto'), 0),
                    COALESCE(SUM(amount) FILTER (WHERE kind = 'ingreso'), 0),
                    COALESCE(SUM(amount) FILTER (
                        WHERE kind = 'gasto' AND status = 'pagado'
                    ), 0)
                FROM budget_lines
                WHERE department = %s AND status <> 'cancelado'
                """,
                (departamento,),
            )
            gastos, ingresos, pagado = cur.fetchone()

    return {
        "gastos": str(gastos),
        "ingresos": str(ingresos),
        "pagado": str(pagado),
        "balance": str(ingresos - gastos),
    }
