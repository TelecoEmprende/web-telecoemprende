"""Avisos a Slack por Incoming Webhook.

Sin OAuth, sin app de Slack, sin backend nuevo: una URL en `SLACK_WEBHOOK_URL`
y un POST. Si la variable no está configurada, no se envía nada y no pasa nada
-- igual que `services/email.py`, un fallo de aviso nunca puede tumbar la
operación que lo dispara.
"""

import json
import logging
import urllib.error
import urllib.request

from backend.config import SLACK_WEBHOOK_URL

logger = logging.getLogger("telecoemprende.slack")

_EMOJI_ESTADO = {
    "pendiente": ":white_circle:",
    "en_progreso": ":large_blue_circle:",
    "por_revisar": ":eyes:",
    "acabado": ":white_check_mark:",
}
_ETIQUETA_ESTADO = {
    "pendiente": "Pendiente",
    "en_progreso": "En progreso",
    "por_revisar": "Por revisar",
    "acabado": "Acabado",
}


def enviar(texto: str) -> bool:
    """Publica `texto` en el canal del webhook. Nunca lanza excepción."""
    if not SLACK_WEBHOOK_URL:
        return False

    peticion = urllib.request.Request(
        SLACK_WEBHOOK_URL,
        data=json.dumps({"text": texto}).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(peticion, timeout=5):
            return True
    except (urllib.error.URLError, urllib.error.HTTPError, OSError) as exc:
        logger.error("fallo enviando aviso a Slack: %s", exc)
        return False


def _quien(email: str) -> str:
    """El nombre de pila basta: en el canal del club nadie se llama igual."""
    return email.split("@")[0] if email else "alguien"


def tarea_creada(tarea: dict, departamento: str, autor: str) -> bool:
    responsables = ", ".join(_quien(r) for r in tarea.get("responsables") or [])
    linea = (
        f":pushpin: *{_quien(autor)}* ha creado una tarea en *{departamento}*: "
        f"*{tarea.get('titulo', '')}*"
    )
    if responsables:
        linea += f"\n> Responsables: {responsables}"
    if tarea.get("deadline"):
        linea += f"\n> Para el {tarea['deadline']}"
    return enviar(linea)


def tarea_cambia_estado(tarea: dict, estado: str, departamento: str, autor: str) -> bool:
    emoji = _EMOJI_ESTADO.get(estado, ":arrows_counterclockwise:")
    etiqueta = _ETIQUETA_ESTADO.get(estado, estado)
    return enviar(
        f"{emoji} *{tarea.get('titulo', '')}* ({departamento}) pasa a *{etiqueta}*"
        f" — {_quien(autor)}"
    )
