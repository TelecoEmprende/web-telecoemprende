import hashlib
import hmac
from datetime import UTC, date, datetime, timedelta

import psycopg2
from flask import session
from werkzeug.security import check_password_hash, generate_password_hash

from backend.config import (
    CALENDARIO_TOKEN_SECRET,
    CARGOS_VALIDOS,
    DATABASE_URL,
    EQUIPO_CON_PERMISOS_ADMIN,
    EQUIPOS_VALIDOS,
)
from backend.services.ics import escapar as escapar_ics

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
            # vp_de: subconjunto de `equipos` donde la persona es VP (gestiona
            # el dashboard de ese equipo). cargo: 'presidente'/'boardmember'/''
            # (dirección, independiente del departamento).
            cur.execute("""
                ALTER TABLE equipo_accesos
                ADD COLUMN IF NOT EXISTS vp_de TEXT[] NOT NULL DEFAULT '{}'
            """)
            cur.execute("""
                ALTER TABLE equipo_accesos
                ADD COLUMN IF NOT EXISTS cargo VARCHAR(20) NOT NULL DEFAULT ''
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS calendario_eventos (
                    id SERIAL PRIMARY KEY,
                    titulo VARCHAR(150) NOT NULL,
                    descripcion VARCHAR(500) NOT NULL DEFAULT '',
                    fecha DATE NOT NULL,
                    hora VARCHAR(5) NOT NULL DEFAULT '',
                    created_at TIMESTAMP NOT NULL DEFAULT NOW()
                )
            """)
        conn.commit()


def _tiene_permisos_admin(equipos: list[str], cargo: str) -> bool:
    return EQUIPO_CON_PERMISOS_ADMIN in equipos or cargo in CARGOS_VALIDOS


def login_equipo(email: str, password: str) -> dict | None:
    email = email.strip().lower()
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT password_hash, equipos, vp_de, cargo
                FROM equipo_accesos WHERE email = %s AND activo = TRUE
                """,
                (email,),
            )
            row = cur.fetchone()

    password_hash = row[0] if row is not None else _DUMMY_HASH
    password_ok = check_password_hash(password_hash, password)

    if row is None or not password_ok:
        return None

    equipos = [e for e in row[1] if e in EQUIPOS_VALIDOS]
    vp_de = [e for e in row[2] if e in equipos]
    cargo = row[3] if row[3] in CARGOS_VALIDOS else ""

    # session.clear() por higiene ante fijación de sesión (mismo criterio que
    # login_admin).
    session.clear()
    session.permanent = True
    session["equipo_email"] = email
    session["equipo_teams"] = equipos
    session["equipo_vp_de"] = vp_de
    session["equipo_cargo"] = cargo
    # Ingeniería, presidencia y board reciben también sesión de /admin:
    # reutiliza la misma clave de sesión que usa login_admin, así
    # is_admin_authenticated() funciona igual venga de /admin o de /equipo.
    if _tiene_permisos_admin(equipos, cargo):
        session["admin_auth"] = True
    return {"teams": equipos, "vp_de": vp_de, "cargo": cargo}


def is_equipo_authenticated() -> bool:
    return "equipo_email" in session


def equipo_session_info() -> dict:
    return {
        "teams": session.get("equipo_teams", []),
        "vp_de": session.get("equipo_vp_de", []),
        "cargo": session.get("equipo_cargo", ""),
    }


def logout_equipo() -> None:
    session.clear()


def token_calendario(email: str) -> str:
    """Firma de un email para el enlace de suscripción al calendario (.ics).

    No se guarda en ningún sitio: se recalcula al verificar, así que no hace
    falta tabla ni migración para invalidar u otorgar acceso, va ligado a
    seguir dado de alta en `equipo_accesos`.
    """
    return hmac.new(
        CALENDARIO_TOKEN_SECRET.encode(), email.strip().lower().encode(), hashlib.sha256
    ).hexdigest()


def equipos_por_token_calendario(email: str, token: str) -> list[str] | None:
    """Verifica el token del enlace de calendario y devuelve los equipos
    activos de ese email, o None si el token no cuadra o la cuenta no existe
    o está de baja."""
    if not hmac.compare_digest(token_calendario(email), token):
        return None
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT equipos FROM equipo_accesos WHERE email = %s AND activo = TRUE",
                (email.strip().lower(),),
            )
            fila = cur.fetchone()
    if fila is None:
        return None
    return [e for e in fila[0] if e in EQUIPOS_VALIDOS]


def listar_equipo_accesos() -> list[dict]:
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, email, equipos, vp_de, cargo, activo, created_at
                FROM equipo_accesos ORDER BY email
                """
            )
            filas = cur.fetchall()

    return [
        {
            "id": f[0],
            "email": f[1],
            "equipos": f[2],
            "vp_de": f[3],
            "cargo": f[4],
            "activo": f[5],
            "created_at": f[6].isoformat(),
        }
        for f in filas
    ]


def _equipos_y_vp_validos(equipos: list[str], vp_de: list[str]) -> bool:
    if not equipos or any(e not in EQUIPOS_VALIDOS for e in equipos):
        return False
    return all(v in equipos for v in vp_de)


def crear_equipo_acceso(
    email: str, password: str, equipos: list[str], vp_de: list[str] | None = None, cargo: str = ""
) -> dict | None:
    """Devuelve None si el email ya existe o si equipos/vp_de/cargo no son válidos."""
    email = email.strip().lower()
    equipos = sorted(set(equipos))
    vp_de = sorted(set(vp_de or []))
    cargo = cargo or ""

    if not _equipos_y_vp_validos(equipos, vp_de):
        return None
    if cargo and cargo not in CARGOS_VALIDOS:
        return None

    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM equipo_accesos WHERE email = %s", (email,))
            if cur.fetchone() is not None:
                return None

            cur.execute(
                """
                INSERT INTO equipo_accesos (email, password_hash, equipos, vp_de, cargo)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id, email, equipos, vp_de, cargo, activo, created_at
                """,
                (email, generate_password_hash(password), equipos, vp_de, cargo),
            )
            fila = cur.fetchone()
        conn.commit()

    return {
        "id": fila[0],
        "email": fila[1],
        "equipos": fila[2],
        "vp_de": fila[3],
        "cargo": fila[4],
        "activo": fila[5],
        "created_at": fila[6].isoformat(),
    }


def actualizar_equipo_acceso(
    acceso_id: int,
    equipos: list[str] | None = None,
    vp_de: list[str] | None = None,
    cargo: str | None = None,
    activo: bool | None = None,
    password: str | None = None,
) -> bool:
    """Actualiza solo los campos que se pasan. Devuelve False si el id no existe
    o si equipos/vp_de/cargo no son válidos.

    `vp_de` se valida contra `equipos`: si se cambia uno sin el otro en la misma
    llamada, se valida contra el `equipos` ya guardado en la fila.
    """
    if equipos is not None:
        equipos = sorted(set(equipos))
    if vp_de is not None:
        vp_de = sorted(set(vp_de))
    if cargo is not None and cargo and cargo not in CARGOS_VALIDOS:
        return False

    campos = []
    valores: list = []

    if equipos is not None or vp_de is not None:
        with _get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT equipos, vp_de FROM equipo_accesos WHERE id = %s", (acceso_id,))
                fila = cur.fetchone()
        if fila is None:
            return False

        equipos_finales = equipos if equipos is not None else fila[0]
        vp_de_finales = vp_de if vp_de is not None else fila[1]
        if not _equipos_y_vp_validos(equipos_finales, vp_de_finales):
            return False

        if equipos is not None:
            campos.append("equipos = %s")
            valores.append(equipos)
        if vp_de is not None:
            campos.append("vp_de = %s")
            valores.append(vp_de)

    if cargo is not None:
        campos.append("cargo = %s")
        valores.append(cargo)
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


# ---------------------------------------------------------------------------
# Calendario compartido: lo gestiona admin, lo ve cualquiera logueado en /equipo.
# ---------------------------------------------------------------------------


def listar_eventos_calendario() -> list[dict]:
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, titulo, descripcion, fecha, hora
                FROM calendario_eventos ORDER BY fecha, hora
                """
            )
            filas = cur.fetchall()

    return [
        {
            "id": f[0],
            "titulo": f[1],
            "descripcion": f[2],
            "fecha": f[3].isoformat(),
            "hora": f[4],
        }
        for f in filas
    ]


def calendario_general_ics() -> str:
    """El calendario compartido de /equipo, en .ics, para suscribirlo en
    Google Calendar (u otro) igual que el de Marketing. Es una tabla pequeña
    y gestionada a mano desde /admin: se manda entera, sin filtrar por rango.
    """
    lineas = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//TelecoEmprende//Equipo//ES",
        "CALSCALE:GREGORIAN",
        "X-PUBLISHED-TTL:PT24H",
    ]
    for evento in listar_eventos_calendario():
        inicio = date.fromisoformat(evento["fecha"])
        lineas += ["BEGIN:VEVENT", f"UID:equipo-evento-{evento['id']}@telecoemprende.es"]
        lineas.append(f"DTSTAMP:{datetime.now(UTC).strftime('%Y%m%dT%H%M%SZ')}")
        if evento["hora"]:
            hora, minuto = evento["hora"].split(":")
            marca = f"{inicio.strftime('%Y%m%d')}T{hora.zfill(2)}{minuto.zfill(2)}00"
            lineas.append(f"DTSTART:{marca}")
        else:
            lineas.append(f"DTSTART;VALUE=DATE:{inicio.strftime('%Y%m%d')}")
            lineas.append(f"DTEND;VALUE=DATE:{(inicio + timedelta(days=1)).strftime('%Y%m%d')}")
        lineas.append(f"SUMMARY:{escapar_ics(evento['titulo'])}")
        if evento["descripcion"]:
            lineas.append(f"DESCRIPTION:{escapar_ics(evento['descripcion'])}")
        lineas.append("END:VEVENT")
    lineas.append("END:VCALENDAR")
    return "\r\n".join(lineas) + "\r\n"


def crear_evento_calendario(titulo: str, descripcion: str, fecha: str, hora: str) -> dict:
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO calendario_eventos (titulo, descripcion, fecha, hora)
                VALUES (%s, %s, %s, %s)
                RETURNING id, titulo, descripcion, fecha, hora
                """,
                (titulo.strip(), descripcion.strip(), fecha, hora.strip()),
            )
            fila = cur.fetchone()
        conn.commit()

    return {
        "id": fila[0],
        "titulo": fila[1],
        "descripcion": fila[2],
        "fecha": fila[3].isoformat(),
        "hora": fila[4],
    }


def actualizar_evento_calendario(
    evento_id: int, titulo: str, descripcion: str, fecha: str, hora: str
) -> bool:
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE calendario_eventos
                SET titulo = %s, descripcion = %s, fecha = %s, hora = %s
                WHERE id = %s
                """,
                (titulo.strip(), descripcion.strip(), fecha, hora.strip(), evento_id),
            )
            actualizado = cur.rowcount > 0
        conn.commit()

    return actualizado


def eliminar_evento_calendario(evento_id: int) -> bool:
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM calendario_eventos WHERE id = %s", (evento_id,))
            eliminado = cur.rowcount > 0
        conn.commit()

    return eliminado
