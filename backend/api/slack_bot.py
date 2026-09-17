"""Bot de Slack que responde dudas sobre /equipo (el CRM, tareas,
calendario...), sobre todo para gente nueva en el club. Escucha menciones
(`@bot`) y DMs vía Events API, y contesta con Gemini usando el contexto de
`services/slack_bot_guia.md`.

Autenticidad de la petición: firma HMAC que manda Slack (ver
https://api.slack.com/authentication/verifying-requests-from-slack) -- no
hay sesión de usuario ni CRON_SECRET, la petición la manda Slack directamente.
"""

import hashlib
import hmac
import logging
import re
import time
from pathlib import Path

from flask import Blueprint, jsonify, request
from google import genai

from backend.config import SLACK_SIGNING_SECRET
from backend.services.slack import responder_en_hilo

logger = logging.getLogger("telecoemprende.slack_bot")

slack_bot_api = Blueprint("slack_bot_api", __name__, url_prefix="/api/slack")

_GUIA = (Path(__file__).resolve().parent.parent / "services" / "slack_bot_guia.md").read_text()
_SYSTEM = (
    "Eres el bot de ayuda interno de TelecoEmprende, un club de "
    "emprendimiento universitario. Respondes dudas del equipo (sobre todo "
    "gente nueva) sobre cómo funciona /equipo: el CRM de campañas, las "
    "tareas, el calendario y los eventos. Responde en español, corto y "
    "concreto, en formato Slack (*negrita* con asteriscos, sin markdown de "
    "más). Si no sabes algo o no está en esta guía, dilo -- no te inventes "
    "botones ni rutas que no existen.\n\n" + _GUIA
)
_MENCION = re.compile(r"^\s*<@[^>]+>\s*")

# ponytail: dedupe en memoria del proceso -- se resetea en cada cold start y
# no se comparte entre instancias. Suficiente para el volumen de un club;
# si empiezan a verse respuestas duplicadas, pasar a un set en la propia BD.
_procesados: set[str] = set()
_gemini = None


def _cliente() -> genai.Client:
    global _gemini
    if _gemini is None:
        _gemini = genai.Client()  # lee GEMINI_API_KEY/GOOGLE_API_KEY del entorno
    return _gemini


def _firma_valida() -> bool:
    if not SLACK_SIGNING_SECRET:
        return False
    timestamp = request.headers.get("X-Slack-Request-Timestamp", "")
    firma = request.headers.get("X-Slack-Signature", "")
    if not timestamp or not firma:
        return False
    try:
        if abs(time.time() - int(timestamp)) > 60 * 5:
            return False
    except ValueError:
        return False
    base = f"v0:{timestamp}:{request.get_data(as_text=True)}"
    esperada = "v0=" + hmac.new(
        SLACK_SIGNING_SECRET.encode(), base.encode(), hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(esperada, firma)


def _responder(pregunta: str) -> str:
    interaccion = _cliente().interactions.create(
        model="gemini-3.8-flash",
        system_instruction=_SYSTEM,
        input=pregunta,
    )
    return interaccion.output_text or ""


@slack_bot_api.route("/events", methods=["POST"])
def api_slack_events():
    if not _firma_valida():
        return jsonify({"error": "firma inválida"}), 401

    payload = request.get_json(force=True, silent=True) or {}

    if payload.get("type") == "url_verification":
        return jsonify({"challenge": payload.get("challenge", "")})

    # Slack reintenta si no contestamos en 3s -- con un LLM de por medio es
    # fácil que pase. No repetimos el trabajo en el reintento.
    if request.headers.get("X-Slack-Retry-Num"):
        return "", 200

    evento = payload.get("event") or {}
    event_id = payload.get("event_id", "")
    tipo = evento.get("type")

    es_ruidoso = (
        not event_id
        or event_id in _procesados
        or evento.get("bot_id")
        or tipo not in ("app_mention", "message")
        or (tipo == "message" and evento.get("channel_type") != "im")
    )
    if es_ruidoso:
        return "", 200

    _procesados.add(event_id)
    pregunta = _MENCION.sub("", evento.get("text", "")).strip()
    canal = evento.get("channel")
    hilo = evento.get("thread_ts") or evento.get("ts")

    try:
        texto_respuesta = _responder(pregunta) if pregunta else ""
    except Exception as exc:  # nunca tumbar el ack a Slack por un fallo de Gemini
        logger.error("fallo respondiendo con Gemini: %s", exc)
        texto_respuesta = "Se me ha ido la pinza un momento, prueba otra vez en un rato 🙃"

    if texto_respuesta:
        responder_en_hilo(canal, hilo, texto_respuesta)
    return "", 200
