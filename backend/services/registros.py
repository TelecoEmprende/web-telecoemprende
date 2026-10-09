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
from psycopg2.extras import RealDictCursor

from backend.config import DATABASE_URL
from backend.services.db import PERSONAS, fijar_personas, id_de_persona


def _get_connection():
    return psycopg2.connect(DATABASE_URL)


@dataclass(frozen=True)
class Tabla:
    """Una entidad del workspace.

    `columnas` son las que se pueden escribir desde la API: nunca se
    interpolan valores de usuario en el SQL, solo estos nombres, que son
    literales del código.
    """

    nombre: str
    columnas: tuple[str, ...]
    orden: str


PRESUPUESTO = Tabla(
    nombre="presupuesto_lineas",
    columnas=("concepto", "tipo", "importe", "estado", "fecha", "notas"),
    orden="COALESCE(fecha, created_at::date) DESC, id DESC",
)

REUNIONES = Tabla(
    nombre="reuniones",
    columnas=("titulo", "fecha", "hora", "objetivo", "asistentes", "acta"),
    orden="fecha DESC, hora DESC, id DESC",
)

SERVICIOS = Tabla(
    nombre="servicios",
    columnas=(
        "nombre", "tipo", "url", "responsables", "renovacion", "estado", "notas",
        "visible_club",
    ),
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


def _alcance(tabla: Tabla, departamento: str | None) -> tuple[str, list]:
    """Cláusula y parámetros que acotan una fila a su departamento."""
    return " AND departamento = %s", [departamento]


def listar(tabla: Tabla, departamento: str | None = None) -> list[dict]:
    donde, valores = _alcance(tabla, departamento)
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
    columnas = [c for c in tabla.columnas if c in campos and c != campo_personas]
    valores = [campos[c] for c in columnas]

    columnas.append("departamento")
    valores.append(departamento)

    marcadores = ", ".join(["%s"] * len(columnas))
    with _get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            columnas.append("creado_por_id")
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
    columnas = [c for c in tabla.columnas if c in campos and c != campo_personas]
    asignaciones = [f"{c} = %s" for c in columnas]
    valores = [campos[c] for c in columnas]
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


def eliminar(tabla: Tabla, fila_id: int, departamento: str | None = None) -> bool:
    donde, valores = _alcance(tabla, departamento)
    with _get_connection() as conn:
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
                "SELECT id, nombre, tipo, url, notas FROM servicios"
                " WHERE visible_club AND url <> '' AND estado <> 'baja'"
                " ORDER BY nombre"
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
                    COALESCE(SUM(importe) FILTER (WHERE tipo = 'gasto'), 0),
                    COALESCE(SUM(importe) FILTER (WHERE tipo = 'ingreso'), 0),
                    COALESCE(SUM(importe) FILTER (
                        WHERE tipo = 'gasto' AND estado = 'pagado'
                    ), 0)
                FROM presupuesto_lineas
                WHERE departamento = %s AND estado <> 'cancelado'
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
