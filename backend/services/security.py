import re
from html import escape
from time import time

from flask import request

from backend.config import (
    BLOCK_WINDOW_SECONDS,
    MAX_APELLIDOS_LEN,
    MAX_EMAIL_LEN,
    MAX_ESTUDIOS_LEN,
    MAX_NOMBRE_LEN,
    MAX_REQUESTS_PER_MINUTE,
)


request_log = {}


def limpiar_texto(texto: str) -> str:
    texto = " ".join(texto.strip().split())
    return escape(texto)


def email_valido(email: str) -> bool:
    patron = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
    return re.match(patron, email) is not None


def longitud_valida(nombre: str, apellidos: str, estudios: str, email: str) -> bool:
    return (
        len(nombre) <= MAX_NOMBRE_LEN
        and len(apellidos) <= MAX_APELLIDOS_LEN
        and len(estudios) <= MAX_ESTUDIOS_LEN
        and len(email) <= MAX_EMAIL_LEN
    )


def obtener_ip_real() -> str:
    forwarded_for = request.headers.get("X-Forwarded-For", "")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.remote_addr or "desconocida"


def demasiadas_peticiones(ip: str) -> bool:
    ahora = time()

    if ip not in request_log:
        request_log[ip] = []

    request_log[ip] = [t for t in request_log[ip] if ahora - t < BLOCK_WINDOW_SECONDS]

    if len(request_log[ip]) >= MAX_REQUESTS_PER_MINUTE:
        return True

    request_log[ip].append(ahora)
    return False

