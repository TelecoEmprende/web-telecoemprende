import ipaddress
import re

from flask import request

from backend.config import (
    MAX_APELLIDOS_LEN,
    MAX_DRIVE_LINK_LEN,
    MAX_EMAIL_LEN,
    MAX_ESCUELA_LEN,
    MAX_ESTUDIOS_LEN,
    MAX_NIVEL_LEN,
    MAX_NOMBRE_LEN,
    MAX_TELEFONO_LEN,
    UPM_EMAIL_DOMAINS,
)
from backend.services.db import conexion, migrar

# Caracteres de control (menos tab y salto de línea): no aportan nada y
# ensucian tanto la base de datos como los exports.
_CONTROL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


def limpiar_texto(texto: str, *, multilinea: bool = False) -> str:
    """Quita caracteres de control y espacios de sobra. Nada más.

    No escapa HTML: antes lo hacía (`html.escape`) y «O'Brien» se guardaba
    como `O&#x27;Brien`, que React pinta tal cual -- React escapa al pintar,
    no desescapa. Contra XSS ya protegen ese escapado de React y la CSP;
    contra inyección SQL, las consultas parametrizadas; contra fórmulas en
    los Excel, `_celda_segura`. Escapar aquí solo corrompía el contenido.
    """
    texto = _CONTROL.sub("", texto)

    if not multilinea:
        return " ".join(texto.split())

    lineas = texto.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    return "\n".join(" ".join(linea.split()) for linea in lineas).strip()


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
    # El proxy de delante (Vercel) AÑADE la IP real del cliente al final de
    # la cabecera; el resto de la cadena puede venir
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
    max_requests: int,
    window_seconds: int,
    bucket: str,
) -> bool:
    """True si esta IP ya ha gastado sus intentos en la ventana; si no, apunta
    uno más. En la base de datos y no en memoria: en Vercel cada instancia
    tenía su propia cuenta, y un ataque repartido entre instancias (o que
    esperara a un arranque en frío) no se frenaba."""
    with conexion() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT count(*) FROM login_attempts WHERE bucket = %s AND ip = %s"
                " AND attempted_at > NOW() - make_interval(secs => %s)",
                (bucket, ip[:64], window_seconds),
            )
            if cur.fetchone()[0] >= max_requests:
                return True
            cur.execute(
                "INSERT INTO login_attempts (bucket, ip) VALUES (%s, %s)", (bucket, ip[:64])
            )
    return False


def purgar_intentos() -> int:
    """Cron diario: los intentos de más de un día ya no cuentan para nada."""
    with conexion() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM login_attempts WHERE attempted_at < NOW() - interval '1 day'")
            return cur.rowcount


def olvidar_intentos() -> None:
    """Para los tests: empezar cada uno sin intentos gastados."""
    migrar()
    with conexion() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM login_attempts")
