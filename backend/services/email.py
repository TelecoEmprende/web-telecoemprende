import json
import logging
import urllib.error
import urllib.request

from backend.config import RESEND_API_KEY, RESEND_FROM_EMAIL, RESEND_FROM_NAME

logger = logging.getLogger("telecoemprende.email")

RESEND_ENDPOINT = "https://api.resend.com/emails"

# Personalización: edita el asunto/cuerpo de cada estado aquí. {nombre} se
# sustituye por el nombre de pila de la persona. El cuerpo admite HTML simple.
_WHATSAPP_URL = "https://chat.whatsapp.com/DdllRrRTg3REkyYW248uFP"

_ASUNTOS = {
    "aceptado": "¡Estás dentro! Bienvenido/a a TelecoEmprende",
    "rechazado": "Tu solicitud a TelecoEmprende",
    "waitlist": "Tu solicitud a TelecoEmprende: estás en lista de espera",
}

_CUERPOS = {
    "aceptado": (
        "Hola {nombre},<br><br>"
        "¡Enhorabuena! Tu solicitud para unirte a TelecoEmprende ha sido "
        "<strong>aceptada</strong>. A partir de ahora formas parte del club, y este curso "
        "lo construimos juntos.<br><br>"
        "Los próximos pasos:<br>"
        "1. Únete a la comunidad de WhatsApp para no perderte nada: "
        f'<a href="{_WHATSAPP_URL}">{_WHATSAPP_URL}</a><br>'
        "2. Muy pronto te escribiremos con la fecha del primer evento del curso.<br><br>"
        "Bienvenido/a a bordo,<br>El equipo de TelecoEmprende"
    ),
    "rechazado": (
        "Hola {nombre},<br><br>"
        "Gracias por presentarte a TelecoEmprende y por el tiempo que le has dedicado a tu "
        "solicitud. Este año no hemos podido ofrecerte una plaza: recibimos muchas más "
        "solicitudes de las que teníamos hueco, y la decisión no ha sido fácil.<br><br>"
        "Esto no es un adiós: nos encantaría verte en nuestros eventos abiertos durante el "
        "curso, y puedes volver a presentarte en la próxima convocatoria.<br><br>"
        "Un saludo,<br>El equipo de TelecoEmprende"
    ),
    "waitlist": (
        "Hola {nombre},<br><br>"
        "Gracias por tu solicitud a TelecoEmprende. Ahora mismo estás en "
        "<strong>lista de espera</strong>: no hay plaza libre en este momento, pero tu "
        "candidatura sigue viva. Si se libera un hueco, te escribiremos a este mismo correo "
        "sin que tengas que hacer nada.<br><br>"
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
        cuerpo = exc.read().decode("utf-8", "replace") if isinstance(exc, urllib.error.HTTPError) else ""
        # ponytail: log temporal de diagnóstico (prefijo/longitud de la key, nunca la key
        # entera) para un 403 que no cuadraba con la key esperada -- quitar en cuanto se
        # confirme la causa real.
        logger.error(
            "fallo enviando email de estado a %s: %s | cuerpo=%s | key_prefix=%s len=%s",
            registro["email"], exc, cuerpo, RESEND_API_KEY[:10], len(RESEND_API_KEY),
        )
        return False


def enviar_recuperacion_clave(email: str, nombre: str, enlace: str, minutos: int) -> bool:
    """El enlace para elegir una contraseña nueva. A diferencia de los avisos
    de estado, aquí quien lo pide se queda sin entrada si falla: devuelve False
    y quien lo llama lo deja apuntado (ver `api/equipo.py`)."""
    if not RESEND_API_KEY:
        logger.error("recuperar contraseña: falta RESEND_API_KEY, no se envía el enlace")
        return False

    saludo = f"Hola {nombre}," if nombre else "Hola,"
    payload = {
        "from": f"{RESEND_FROM_NAME} <{RESEND_FROM_EMAIL}>",
        "to": [email],
        "subject": "Elige una contraseña nueva para TelecoEmprende",
        "html": (
            f"{saludo}<br><br>"
            "Has pedido cambiar la contraseña de tu cuenta del equipo. Entra en este enlace "
            f"para elegir una nueva (vale {minutos} minutos y solo se puede usar una vez):<br><br>"
            f'<a href="{enlace}">{enlace}</a><br><br>'
            "Si no lo has pedido tú, ignora este correo: tu contraseña sigue siendo la de "
            "siempre.<br><br>El equipo de TelecoEmprende"
        ),
    }
    request = urllib.request.Request(
        RESEND_ENDPOINT,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=10):
            return True
    except (urllib.error.URLError, urllib.error.HTTPError, OSError) as exc:
        logger.error("fallo enviando el enlace de recuperación: %s", exc)
        return False
