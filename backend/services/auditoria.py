"""Registro de auditoría de /equipo: quién cambió qué y cuándo.

Se apunta cada petición que cambia algo (POST/PUT/PATCH/DELETE bajo /api/)
y cada descarga de datos personales (Excel/PDF de cuentas e inscripciones),
desde un `after_request` de `app.py`. Se guarda la ruta, no el cuerpo: así
nunca quedan aquí contraseñas, DNI ni el texto de una nota, pero sí se puede
reconstruir "Ana borró la tarea 12 el martes a las 18:04".

Fail-open como el email y Slack: si la base de datos falla, la acción del
usuario sigue adelante y solo se pierde la línea de registro.
"""

import logging

import psycopg2
from psycopg2.extras import RealDictCursor

from backend.config import DATABASE_URL

logger = logging.getLogger("telecoemprende.auditoria")

METODOS_QUE_CAMBIAN = {"POST", "PUT", "PATCH", "DELETE"}
# Lecturas que también se registran: sacan datos personales del club.
DESCARGAS = ("/api/admin/equipo/excel", "/api/admin/equipo/pdf", "/api/admin/download")
# Llamadas de máquinas, no de personas: su propio registro no aporta nada.
EXCLUIDAS = ("/api/cron/", "/api/slack/")

MAX_RUTA_LEN = 255

def _get_connection():
    return psycopg2.connect(DATABASE_URL)


def debe_registrarse(metodo: str, ruta: str) -> bool:
    if not ruta.startswith("/api/") or ruta.startswith(EXCLUIDAS):
        return False
    return metodo in METODOS_QUE_CAMBIAN or (metodo == "GET" and ruta.startswith(DESCARGAS))


def registrar(email: str, metodo: str, ruta: str, estado: int, ip: str) -> None:
    try:
        with _get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO auditoria (email, metodo, ruta, estado, ip) VALUES (%s, %s, %s, %s, %s)",
                    (email[:120], metodo[:8], ruta[:MAX_RUTA_LEN], estado, ip[:64]),
                )
            conn.commit()
    except Exception:  # noqa: BLE001 -- fail-open, ver docstring del módulo.
        logger.exception("no se pudo registrar en auditoría %s %s", metodo, ruta)


def listar(q: str = "", limite: int = 200) -> list[dict]:
    """Lo último primero. `q` filtra por email o ruta (contiene, sin mayúsculas)."""
    with _get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            donde, valores = "", []
            if q.strip():
                patron = f"%{q.strip().lower()}%"
                donde, valores = "WHERE lower(email) LIKE %s OR lower(ruta) LIKE %s", [patron, patron]
            cur.execute(
                "SELECT id, momento, email, metodo, ruta, estado, ip FROM auditoria"
                f" {donde} ORDER BY momento DESC, id DESC LIMIT %s",
                [*valores, limite],
            )
            filas = cur.fetchall()
    return [{**f, "momento": f["momento"].isoformat()} for f in filas]
