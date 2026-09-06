import psycopg2
from flask import session
from werkzeug.security import check_password_hash, generate_password_hash

from backend.config import DATABASE_URL, EQUIPO_CON_PERMISOS_ADMIN, EQUIPOS_VALIDOS

# Hash "de relleno" para cuando el email no existe: sin esto, saltarse
# check_password_hash en ese caso haría que la respuesta fuera más rápida
# para emails no registrados, filtrando por tiempo qué correos están de alta.
_DUMMY_HASH = generate_password_hash("no-existe-ningun-usuario-con-este-email")


def _get_connection():
    return psycopg2.connect(DATABASE_URL)


def init_equipo_db():
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS equipo_accesos (
                    id SERIAL PRIMARY KEY,
                    email VARCHAR(120) NOT NULL UNIQUE,
                    password_hash VARCHAR(255) NOT NULL,
                    equipos TEXT[] NOT NULL DEFAULT '{}',
                    activo BOOLEAN NOT NULL DEFAULT TRUE,
                    created_at TIMESTAMP NOT NULL DEFAULT NOW()
                )
            """)
        conn.commit()


def login_equipo(email: str, password: str) -> list[str] | None:
    email = email.strip().lower()
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT password_hash, equipos FROM equipo_accesos WHERE email = %s AND activo = TRUE",
                (email,),
            )
            row = cur.fetchone()

    password_hash = row[0] if row is not None else _DUMMY_HASH
    password_ok = check_password_hash(password_hash, password)

    if row is None or not password_ok:
        return None

    equipos = [e for e in row[1] if e in EQUIPOS_VALIDOS]

    # session.clear() por higiene ante fijación de sesión (mismo criterio que
    # login_admin).
    session.clear()
    session.permanent = True
    session["equipo_email"] = email
    session["equipo_teams"] = equipos
    # El equipo de ingeniería también recibe acceso al panel /admin: reutiliza
    # la misma clave de sesión que usa login_admin, así is_admin_authenticated()
    # funciona igual venga la sesión de /admin o de /equipo.
    if EQUIPO_CON_PERMISOS_ADMIN in equipos:
        session["admin_auth"] = True
    return equipos


def is_equipo_authenticated() -> bool:
    return "equipo_email" in session


def equipo_teams() -> list[str]:
    return session.get("equipo_teams", [])


def logout_equipo() -> None:
    session.clear()


def listar_equipo_accesos() -> list[dict]:
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, email, equipos, activo, created_at FROM equipo_accesos ORDER BY email"
            )
            filas = cur.fetchall()

    return [
        {
            "id": f[0],
            "email": f[1],
            "equipos": f[2],
            "activo": f[3],
            "created_at": f[4].isoformat(),
        }
        for f in filas
    ]


def crear_equipo_acceso(email: str, password: str, equipos: list[str]) -> dict | None:
    """Devuelve None si el email ya existe o si algún equipo no es válido."""
    email = email.strip().lower()
    equipos = sorted(set(equipos))
    if not equipos or any(e not in EQUIPOS_VALIDOS for e in equipos):
        return None

    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM equipo_accesos WHERE email = %s", (email,))
            if cur.fetchone() is not None:
                return None

            cur.execute(
                """
                INSERT INTO equipo_accesos (email, password_hash, equipos)
                VALUES (%s, %s, %s)
                RETURNING id, email, equipos, activo, created_at
                """,
                (email, generate_password_hash(password), equipos),
            )
            fila = cur.fetchone()
        conn.commit()

    return {
        "id": fila[0],
        "email": fila[1],
        "equipos": fila[2],
        "activo": fila[3],
        "created_at": fila[4].isoformat(),
    }


def actualizar_equipo_acceso(
    acceso_id: int,
    equipos: list[str] | None = None,
    activo: bool | None = None,
    password: str | None = None,
) -> bool:
    """Actualiza solo los campos que se pasan. Devuelve False si el id no existe
    o si `equipos` incluye algún valor no válido."""
    if equipos is not None:
        equipos = sorted(set(equipos))
        if not equipos or any(e not in EQUIPOS_VALIDOS for e in equipos):
            return False

    campos = []
    valores: list = []
    if equipos is not None:
        campos.append("equipos = %s")
        valores.append(equipos)
    if activo is not None:
        campos.append("activo = %s")
        valores.append(activo)
    if password:
        campos.append("password_hash = %s")
        valores.append(generate_password_hash(password))

    if not campos:
        return False

    valores.append(acceso_id)
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE equipo_accesos SET {', '.join(campos)} WHERE id = %s",
                valores,
            )
            actualizado = cur.rowcount > 0
        conn.commit()

    return actualizado


def eliminar_equipo_acceso(acceso_id: int) -> bool:
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM equipo_accesos WHERE id = %s", (acceso_id,))
            eliminado = cur.rowcount > 0
        conn.commit()

    return eliminado
