"""Lo común a toda la base de datos: el esquema (migraciones) y cómo se
guardan las personas.

Esquema
-------
El esquema vive en `backend/migrations/NNNN_nombre.sql`. Cada archivo se
aplica una sola vez, en orden, y queda apuntado en `schema_migrations`; para
cambiar el esquema se añade un archivo nuevo, nunca se edita uno aplicado.
`migrar()` lo hace al arrancar cada instancia (ver `app.py`) y en los tests.

Personas
--------
Una persona se referencia siempre por el id de su cuenta
(`equipo_accesos.id`), con clave foránea: en `creado_por_id`/`autor_id` y en
las tablas de "quién está en qué" (`tarea_responsables`...). La API sigue
hablando en emails, así que aquí se traducen: al escribir, email -> id (un
email sin cuenta es un error de datos, no algo que guardar suelto); al leer,
las vistas `<tabla>_v` devuelven las personas ya como emails.
"""

from pathlib import Path

import psycopg2

from backend.config import DATABASE_URL

MIGRACIONES = Path(__file__).resolve().parent.parent / "migrations"

# Clave fija del bloqueo: dos instancias que arrancan a la vez no aplican la
# misma migración dos veces; la segunda espera y ya la encuentra hecha.
_BLOQUEO_MIGRACIONES = 7_350_118

_migrado = False


class DatosInvalidos(ValueError):
    """Error de validación con el mensaje que se le enseña al usuario."""


def migrar() -> None:
    global _migrado
    if _migrado:
        return
    with psycopg2.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT pg_advisory_xact_lock(%s)", (_BLOQUEO_MIGRACIONES,))
            cur.execute("""
                CREATE TABLE IF NOT EXISTS schema_migrations (
                    version VARCHAR(120) PRIMARY KEY,
                    aplicada_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            """)
            cur.execute("SELECT version FROM schema_migrations")
            hechas = {fila[0] for fila in cur.fetchall()}
            archivos = sorted(MIGRACIONES.glob("*.sql"))
            if not archivos:
                # Un despliegue que no se lleve los .sql arrancaría contra un
                # esquema que no existe: mejor fallar aquí, con el motivo.
                raise RuntimeError(f"No hay migraciones en {MIGRACIONES}")
            for archivo in archivos:
                if archivo.stem in hechas:
                    continue
                cur.execute(archivo.read_text(encoding="utf-8"))
                cur.execute("INSERT INTO schema_migrations (version) VALUES (%s)", (archivo.stem,))
            _cerrar_api_publica(cur)
        conn.commit()
    _migrado = True


def _cerrar_api_publica(cur) -> None:
    """Supabase publica todo lo de `public` en su API REST, a la que entra
    cualquiera con la clave pública del proyecto. RLS sin políticas cierra las
    tablas (el backend, su dueño, no se ve afectado) y las vistas se crean con
    `security_invoker`, así que heredan ese cierre. Se repasa en cada arranque
    para que ninguna tabla nueva se quede abierta por olvido."""
    cur.execute(
        "SELECT relname FROM pg_class"
        " WHERE relnamespace = 'public'::regnamespace AND relkind = 'r' AND NOT relrowsecurity"
    )
    for (tabla,) in cur.fetchall():
        cur.execute(f'ALTER TABLE public."{tabla}" ENABLE ROW LEVEL SECURITY')


# --------------------------------------------------------------------------
# Personas
# --------------------------------------------------------------------------

# Qué tabla guarda las personas de cada entidad, con qué columna apunta a la
# fila y cómo se llama el campo en la API.
PERSONAS = {
    "tasks": ("tarea_responsables", "tarea_id", "responsables"),
    "contents": ("entregable_responsables", "entregable_id", "responsables"),
    "reuniones": ("reunion_asistentes", "reunion_id", "asistentes"),
    "servicios": ("servicio_responsables", "servicio_id", "responsables"),
}


def id_de_persona(cur, email: str) -> int | None:
    """Id de la cuenta con ese email, o None (p. ej. una sesión de admin sin
    cuenta de equipo)."""
    cur.execute(
        "SELECT id FROM equipo_accesos WHERE email = %s", ((email or "").strip().lower(),)
    )
    fila = cur.fetchone()
    return _primera(fila)


def ids_de_personas(cur, emails: list[str]) -> list[int]:
    """Ids en el mismo orden y sin repetir. Un email sin cuenta es un error:
    la lista se eligió del directorio del equipo, así que no debería pasar, y
    guardarlo suelto es justo lo que dejaba datos que no apuntaban a nadie."""
    limpios = list(dict.fromkeys(e.strip().lower() for e in emails if e and e.strip()))
    if not limpios:
        return []
    cur.execute("SELECT email AS email, id AS id FROM equipo_accesos WHERE email = ANY(%s)", (limpios,))
    # El cursor puede ser de tuplas o de diccionarios según quién llame.
    por_email = {
        (f["email"] if isinstance(f, dict) else f[0]): (f["id"] if isinstance(f, dict) else f[1])
        for f in cur.fetchall()
    }
    desconocidos = [e for e in limpios if e not in por_email]
    if desconocidos:
        raise DatosInvalidos(f"No hay ninguna cuenta del equipo con el email {desconocidos[0]}.")
    return [por_email[e] for e in limpios]


def fijar_personas(cur, tabla: str, fila_id: int, emails: list[str]) -> None:
    """Sustituye las personas de una fila por estas, en este orden."""
    tabla_personas, columna, _ = PERSONAS[tabla]
    ids = ids_de_personas(cur, emails)
    cur.execute(f"DELETE FROM {tabla_personas} WHERE {columna} = %s", (fila_id,))
    for orden, persona_id in enumerate(ids, start=1):
        cur.execute(
            f"INSERT INTO {tabla_personas} ({columna}, persona_id, orden) VALUES (%s, %s, %s)",
            (fila_id, persona_id, orden),
        )


def _primera(fila):
    if fila is None:
        return None
    return fila["id"] if isinstance(fila, dict) else fila[0]
