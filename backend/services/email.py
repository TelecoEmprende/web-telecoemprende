import json
import logging
import urllib.error
import urllib.request

from backend.config import RESEND_API_KEY, RESEND_FROM_EMAIL, RESEND_FROM_NAME

logger = logging.getLogger("telecoemprende.email")

RESEND_ENDPOINT = "https://api.resend.com/emails"

# Personalización: edita el asunto/cuerpo de cada estado aquí. {nombre} se
# sustituye por el nombre de pila de la persona. El cuerpo admite HTML simple.
_ASUNTOS = {
    "aceptado": "¡Bienvenido/a a TelecoEmprende! Tu inscripción ha sido aceptada",
    "rechazado": "Tu inscripción a TelecoEmprende",
    "waitlist": "Tu inscripción a TelecoEmprende está en lista de espera",
}

_CUERPOS = {
    "aceptado": (
        "Hola {nombre},<br><br>"
        "¡Enhorabuena! Tu inscripción a TelecoEmprende ha sido <strong>aceptada</strong>. "
        "En los próximos días te contactaremos con los siguientes pasos.<br><br>"
        "Un saludo,<br>El equipo de TelecoEmprende"
    ),
    "rechazado": (
        "Hola {nombre},<br><br>"
        "Gracias por tu interés en TelecoEmprende. Este año no hemos podido ofrecerte una plaza, "
        "pero te animamos a seguir participando en nuestros eventos.<br><br>"
        "Un saludo,<br>El equipo de TelecoEmprende"
    ),
    "waitlist": (
        "Hola {nombre},<br><br>"
        "Gracias por tu interés en TelecoEmprende. Ahora mismo tu inscripción está en "
        "<strong>lista de espera</strong>: si se libera una plaza, te contactaremos por este mismo correo.<br><br>"
        "Un saludo,<br>El equipo de TelecoEmprende"
    ),
}


def enviar_email_estado(registro: dict, estado: str) -> bool:
    """Envía el email de aceptación/rechazo vía Resend. No lanza excepción:
    un fallo de email nunca debe bloquear el cambio de estado en el panel.
    ponytail: sin cola/reintentos, envío síncrono best-effort — añadir cola si el volumen crece.
    """
    if not RESEND_API_KEY or estado not in _ASUNTOS:
        return False

    payload = {
        "from": f"{RESEND_FROM_NAME} <{RESEND_FROM_EMAIL}>",
        "to": [registro["email"]],
        "subject": _ASUNTOS[estado],
        "html": _CUERPOS[estado].format(nombre=registro["nombre"]),
    }
    request = urllib.request.Request(
        RESEND_ENDPOINT,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {RESEND_API_KEY}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=10):
            return True
    except (urllib.error.URLError, urllib.error.HTTPError) as exc:
        logger.error("fallo enviando email de estado a %s: %s", registro["email"], exc)
        return False
