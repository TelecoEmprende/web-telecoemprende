import ipaddress
import re
from html import escape
from time import time

from flask import request

from backend.config import (
    BLOCK_WINDOW_SECONDS,
    MAX_APELLIDOS_LEN,
    MAX_DRIVE_LINK_LEN,
    MAX_EMAIL_LEN,
    MAX_ESCUELA_LEN,
    MAX_ESTUDIOS_LEN,
    MAX_NIVEL_LEN,
    MAX_NOMBRE_LEN,
    MAX_REQUESTS_PER_MINUTE,
    MAX_TELEFONO_LEN,
    UPM_EMAIL_DOMAINS,
)


request_log = {}


def limpiar_texto(texto: str) -> str:
    texto = " ".join(texto.strip().split())
    return escape(texto)


def email_valido(email: str) -> bool:
    patron = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
    return re.match(patron, email) is not None


def email_upm_valido(email: str) -> bool:
    if not email_valido(email):
        return False
    dominio = email.rsplit("@", 1)[-1].strip().lower()
    return dominio in UPM_EMAIL_DOMAINS


def drive_link_valido(url: str) -> bool:
    patron = r"^https?://(www\.)?drive\.google\.com/.+"
    return re.match(patron, url.strip(), re.IGNORECASE) is not None


def telefono_valido(telefono: str) -> bool:
    patron = r"^\+?[0-9\s]{9,20}$"
    return re.match(patron, telefono.strip()) is not None


def longitud_valida(
    nombre: str,
    apellidos: str,
    estudios: str,
    email: str,
    drive_link: str = "",
    escuela: str = "",
    nivel: str = "",
    telefono: str = "",
) -> bool:
    return (
        len(nombre) <= MAX_NOMBRE_LEN
        and len(apellidos) <= MAX_APELLIDOS_LEN
        and len(estudios) <= MAX_ESTUDIOS_LEN
        and len(email) <= MAX_EMAIL_LEN
        and len(drive_link) <= MAX_DRIVE_LINK_LEN
        and len(escuela) <= MAX_ESCUELA_LEN
        and len(nivel) <= MAX_NIVEL_LEN
        and len(telefono) <= MAX_TELEFONO_LEN
    )


def obtener_ip_real() -> str:
    # nginx (docker-compose) usa $proxy_add_x_forwarded_for, que AÑADE la IP real
    # del cliente al final de la cabecera; el resto de la cadena puede venir
    # directamente del cliente y no es de fiar (un atacante podría escribir
    # cualquier cosa ahí para saltarse el rate limiting por IP o inyectar datos
    # en el registro/Excel). Nos quedamos con el último valor -el que añade
    # nuestro proxy- y solo lo usamos si tiene pinta de IP real.
    forwarded_for = request.headers.get("X-Forwarded-For", "")
    if forwarded_for:
        candidato = forwarded_for.split(",")[-1].strip()
        try:
            ipaddress.ip_address(candidato)
            return candidato
        except ValueError:
            pass
    return request.remote_addr or "desconocida"


def demasiadas_peticiones(
    ip: str,
    max_requests: int = MAX_REQUESTS_PER_MINUTE,
    window_seconds: int = BLOCK_WINDOW_SECONDS,
    bucket: str = "default",
) -> bool:
    ahora = time()
    key = f"{bucket}:{ip}"

    if key not in request_log:
        request_log[key] = []

    request_log[key] = [t for t in request_log[key] if ahora - t < window_seconds]

    if len(request_log[key]) >= max_requests:
        return True

    request_log[key].append(ahora)
    return False

