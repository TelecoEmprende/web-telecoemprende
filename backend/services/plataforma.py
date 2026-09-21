"""Estado de la plataforma para el equipo de Ingeniería.

Dice si las cosas están puestas, nunca cuánto valen: de aquí no sale ni una
clave ni un secreto, solo un sí o un no. Lo único con contenido es el commit
desplegado, que es público (el repositorio lo es).
"""

import os
import time

import psycopg2

from backend.config import (
    CRON_SECRET,
    DATABASE_URL,
    RESEND_API_KEY,
    SLACK_BOT_TOKEN,
    SLACK_SIGNING_SECRET,
    SLACK_WEBHOOK_URL,
)


def _base_de_datos() -> dict:
    """Un `SELECT 1` con tope de espera: si Postgres no contesta, la pantalla
    tiene que decirlo en vez de quedarse colgada como el resto."""
    inicio = time.perf_counter()
    try:
        conn = psycopg2.connect(DATABASE_URL, connect_timeout=3)
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
        finally:
            conn.close()
    except psycopg2.Error:
        return {"ok": False, "ms": None}
    return {"ok": True, "ms": round((time.perf_counter() - inicio) * 1000)}


def _integraciones() -> list[dict]:
    # El "efecto" es lo que pasa si falta: casi todo aquí falla en silencio a
    # propósito (ver services/email.py y services/slack.py), y por eso hace
    # falta una pantalla que lo enseñe -- si no, nadie se entera.
    return [
        {
            "nombre": "Sesiones",
            "variable": "FLASK_SECRET_KEY",
            "configurada": bool(os.environ.get("FLASK_SECRET_KEY")),
            "efecto": "Cada instancia inventa su propia clave y las sesiones se caen.",
        },
        {
            "nombre": "Correo (Resend)",
            "variable": "RESEND_API_KEY",
            "configurada": bool(RESEND_API_KEY),
            "efecto": "No salen los correos al aceptar o rechazar inscripciones.",
        },
        {
            "nombre": "Avisos de Slack",
            "variable": "SLACK_WEBHOOK_URL",
            "configurada": bool(SLACK_WEBHOOK_URL),
            "efecto": "No hay avisos de tareas nuevas ni de deadlines.",
        },
        {
            "nombre": "Bot de Slack",
            "variable": "SLACK_BOT_TOKEN + SLACK_SIGNING_SECRET",
            "configurada": bool(SLACK_BOT_TOKEN and SLACK_SIGNING_SECRET),
            "efecto": "El bot no recibe ni contesta mensajes.",
        },
        {
            "nombre": "Respuestas del bot (Gemini)",
            "variable": "GEMINI_API_KEY",
            "configurada": bool(
                os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
            ),
            "efecto": "El bot recibe los mensajes pero no puede contestar.",
        },
        {
            "nombre": "Cron de deadlines",
            "variable": "CRON_SECRET",
            "configurada": bool(CRON_SECRET),
            "efecto": "El aviso diario de tareas que vencen mañana se rechaza.",
        },
    ]


def estado_plataforma() -> dict:
    return {
        # Las tres VERCEL_* las inyecta la plataforma; en local no existen.
        "entorno": os.environ.get("VERCEL_ENV", "local"),
        "commit": os.environ.get("VERCEL_GIT_COMMIT_SHA", "")[:7],
        "rama": os.environ.get("VERCEL_GIT_COMMIT_REF", ""),
        "base_de_datos": _base_de_datos(),
        "integraciones": _integraciones(),
    }
