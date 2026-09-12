"""Registros del workspace: recursos, presupuesto, anuncios, reuniones, alumni.

Las cinco cosas son la misma operación (listar, crear, editar, borrar filas de
una tabla, casi siempre acotadas a un departamento) sobre esquemas distintos.
En vez de escribir cinco CRUD idénticos, cada entidad se describe con una
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
    #: Los anuncios son del club entero; el resto vive dentro de un departamento.
    por_departamento: bool = True


RECURSOS = Tabla(
    nombre="recursos",
    columnas=("titulo", "tipo", "url", "notas"),
    orden="created_at DESC, id DESC",
)

PRESUPUESTO = Tabla(
    nombre="presupuesto_lineas",
    columnas=("concepto", "tipo", "importe", "estado", "fecha", "notas"),
    orden="COALESCE(fecha, created_at::date) DESC, id DESC",
)

ANUNCIOS = Tabla(
    nombre="anuncios",
    columnas=("titulo", "cuerpo", "fijado"),
    # Los fijados arriba: un anuncio se fija justamente para que no se pierda
    # según llegan otros.
    orden="fijado DESC, created_at DESC, id DESC",
    por_departamento=False,
)

REUNIONES = Tabla(
    nombre="reuniones",
    columnas=("titulo", "fecha", "hora", "objetivo", "asistentes", "acta"),
    orden="fecha DESC, hora DESC, id DESC",
)

ALUMNI = Tabla(
    nombre="alumni",
    columnas=(
        "nombre", "promocion", "empresa", "puesto", "email",
        "linkedin", "estado", "notas",
    ),
    orden="nombre",
)

RECURSO_TIPOS = ("documento", "enlace", "carpeta", "plantilla", "otro")
PRESUPUESTO_TIPOS = ("gasto", "ingreso")
PRESUPUESTO_ESTADOS = ("previsto", "aprobado", "pagado", "cancelado")
ALUMNI_ESTADOS = ("pendiente", "contactado", "en_conversacion", "colabora", "descartado")


def init_registros_db():
    # Ahora la llama la puerta común de todas las rutas de marketing_api
    # (`requiere_equipo`), así que puede correr en paralelo con ella misma
    # -- varias peticiones a la vez sobre una base de datos que todavía no
    # tiene estas tablas (el primer `Promise.all` de un departamento nuevo).
    # `CREATE TABLE IF NOT EXISTS` no es atómico entre transacciones: dos
    # peticiones pueden comprobar a la vez que la tabla no existe y las dos
    # intentar crearla, y la segunda revienta contra el catálogo de Postgres
    # (UniqueViolation en pg_type) en vez de contra un "ya existe" limpio. Si
    # eso pasa, es porque la otra petición ya la ha creado -- no hay nada que
    # arreglar, solo devolver como si hubiera ido bien.
    try:
        _crear_tablas_registros()
    except psycopg2.errors.UniqueViolation:
        pass


def _crear_tablas_registros():
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS recursos (
                    id SERIAL PRIMARY KEY,
                    departamento VARCHAR(20) NOT NULL,
                    titulo VARCHAR(160) NOT NULL,
                    tipo VARCHAR(20) NOT NULL DEFAULT 'enlace',
                    url TEXT NOT NULL DEFAULT '',
                    notas TEXT NOT NULL DEFAULT '',
                    creado_por VARCHAR(120) NOT NULL DEFAULT '',
                    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
                )
            """)
            # NUMERIC y no float: el total de un presupuesto no puede depender
            # de cómo redondee el binario. Se serializa como texto por lo mismo.
            cur.execute("""
                CREATE TABLE IF NOT EXISTS presupuesto_lineas (
                    id SERIAL PRIMARY KEY,
                    departamento VARCHAR(20) NOT NULL,
                    concepto VARCHAR(160) NOT NULL,
                    tipo VARCHAR(10) NOT NULL DEFAULT 'gasto',
                    importe NUMERIC(10, 2) NOT NULL DEFAULT 0,
                    estado VARCHAR(20) NOT NULL DEFAULT 'previsto',
                    fecha DATE,
                    notas TEXT NOT NULL DEFAULT '',
                    creado_por VARCHAR(120) NOT NULL DEFAULT '',
                    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS anuncios (
                    id SERIAL PRIMARY KEY,
                    titulo VARCHAR(160) NOT NULL,
                    cuerpo TEXT NOT NULL DEFAULT '',
                    fijado BOOLEAN NOT NULL DEFAULT FALSE,
                    creado_por VARCHAR(120) NOT NULL DEFAULT '',
                    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS reuniones (
                    id SERIAL PRIMARY KEY,
                    departamento VARCHAR(20) NOT NULL,
                    titulo VARCHAR(160) NOT NULL,
                    fecha DATE,
                    hora VARCHAR(5) NOT NULL DEFAULT '',
                    objetivo TEXT NOT NULL DEFAULT '',
                    asistentes TEXT[] NOT NULL DEFAULT '{}',
                    acta TEXT NOT NULL DEFAULT '',
                    creado_por VARCHAR(120) NOT NULL DEFAULT '',
                    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS alumni (
                    id SERIAL PRIMARY KEY,
                    departamento VARCHAR(20) NOT NULL,
                    nombre VARCHAR(120) NOT NULL,
                    promocion VARCHAR(20) NOT NULL DEFAULT '',
                    empresa VARCHAR(120) NOT NULL DEFAULT '',
                    puesto VARCHAR(120) NOT NULL DEFAULT '',
                    email VARCHAR(120) NOT NULL DEFAULT '',
                    linkedin TEXT NOT NULL DEFAULT '',
                    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
                    notas TEXT NOT NULL DEFAULT '',
                    creado_por VARCHAR(120) NOT NULL DEFAULT '',
                    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
                )
            """)
            for tabla in (RECURSOS, PRESUPUESTO, REUNIONES, ALUMNI):
                cur.execute(
                    f"CREATE INDEX IF NOT EXISTS {tabla.nombre}_depto_idx"
                    f" ON {tabla.nombre} (departamento)"
                )
        conn.commit()


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
    if not tabla.por_departamento:
        return "", []
    return " AND departamento = %s", [departamento]


def listar(tabla: Tabla, departamento: str | None = None) -> list[dict]:
    donde, valores = _alcance(tabla, departamento)
    with _get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                f"SELECT * FROM {tabla.nombre} WHERE TRUE{donde}"
                f" ORDER BY {tabla.orden}",
                valores,
            )
            return [_serializar(f) for f in cur.fetchall()]


def obtener(tabla: Tabla, fila_id: int, departamento: str | None = None) -> dict | None:
    donde, valores = _alcance(tabla, departamento)
    with _get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                f"SELECT * FROM {tabla.nombre} WHERE id = %s{donde}",
                [fila_id, *valores],
            )
            fila = cur.fetchone()
    return _serializar(fila) if fila is not None else None


def crear(tabla: Tabla, campos: dict, creado_por: str, departamento: str | None = None) -> dict:
    columnas = [c for c in tabla.columnas if c in campos]
    valores = [campos[c] for c in columnas]

    columnas.append("creado_por")
    valores.append(creado_por)
    if tabla.por_departamento:
        columnas.append("departamento")
        valores.append(departamento)

    marcadores = ", ".join(["%s"] * len(columnas))
    with _get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                f"INSERT INTO {tabla.nombre} ({', '.join(columnas)})"
                f" VALUES ({marcadores}) RETURNING *",
                valores,
            )
            fila = cur.fetchone()
        conn.commit()
    return _serializar(fila)


def actualizar(
    tabla: Tabla, fila_id: int, campos: dict, departamento: str | None = None
) -> bool:
    """El departamento va en el WHERE del propio UPDATE: pasar el id de una
    fila de otro departamento no actualiza nada, sin SELECT previo."""
    asignaciones = [f"{c} = %s" for c in tabla.columnas if c in campos]
    valores = [campos[c] for c in tabla.columnas if c in campos]
    if not asignaciones:
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
