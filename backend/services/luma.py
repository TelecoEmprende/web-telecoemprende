"""Eventos del calendario público de Luma, para el Inicio de /equipo.

Se lee el feed iCal abierto del calendario (`api.lu.ma/ics/get`), que no pide
clave. Como `services/email.py` y `services/slack.py`: si Luma no contesta,
se devuelve lo último que se tenga (o nada) y el resto del panel sigue igual.
"""

import logging
import re
import time
import urllib.request
from datetime import datetime, timezone

from backend.config import LUMA_CALENDAR_ID

logger = logging.getLogger("telecoemprende.luma")

ICS_URL = "https://api.lu.ma/ics/get?entity=calendar&id={}"
# ponytail: caché en memoria por instancia; si hiciera falta compartirla entre
# instancias, Runtime Cache de Vercel.
CACHE_SEGUNDOS = 15 * 60
_cache: dict = {"hasta": 0.0, "eventos": []}

# La página de cada evento viene en la descripción ("Get up-to-date
# information at: https://luma.com/xxxx"). Solo se acepta ese dominio: el
# enlace acaba en un `<a href>` del panel.
_ENLACE = re.compile(r"https://(?:luma\.com|lu\.ma)/[A-Za-z0-9_-]+")


def _desplegar(texto: str) -> list[str]:
    """Líneas lógicas del iCal: una línea que empieza por espacio continúa la
    anterior (RFC 5545, 3.1)."""
    lineas: list[str] = []
    for linea in texto.replace("\r\n", "\n").split("\n"):
        if linea.startswith((" ", "\t")) and lineas:
            lineas[-1] += linea[1:]
        else:
            lineas.append(linea)
    return lineas


def _fecha(valor: str) -> datetime | None:
    for formato in ("%Y%m%dT%H%M%SZ", "%Y%m%d"):
        try:
            return datetime.strptime(valor, formato).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


def _texto(valor: str) -> str:
    return valor.replace("\\n", " ").replace("\\,", ",").replace("\;", ";").replace("\\\\", "\\")


def parsear_ics(texto: str) -> list[dict]:
    eventos, actual = [], None
    for linea in _desplegar(texto):
        if linea == "BEGIN:VEVENT":
            actual = {}
        elif linea == "END:VEVENT" and actual is not None:
            inicio = _fecha(actual.get("DTSTART", ""))
            if inicio and actual.get("SUMMARY"):
                enlace = _ENLACE.search(actual.get("DESCRIPTION", ""))
                eventos.append({
                    "id": actual.get("UID", ""),
                    "titulo": _texto(actual["SUMMARY"])[:200],
                    "inicio": inicio.isoformat(),
                    "lugar": _texto(actual.get("LOCATION", "")).split(",")[0][:200],
                    "url": enlace.group(0) if enlace else "",
                })
            actual = None
        elif actual is not None and ":" in linea:
            clave, valor = linea.split(":", 1)
            actual[clave.split(";", 1)[0]] = valor
    return sorted(eventos, key=lambda e: e["inicio"])


def eventos_luma() -> list[dict]:
    """Los eventos que aún no han empezado, de más próximo a más lejano."""
    ahora = time.time()
    if ahora >= _cache["hasta"]:
        try:
            peticion = urllib.request.Request(
                ICS_URL.format(LUMA_CALENDAR_ID), headers={"User-Agent": "TelecoEmprende"}
            )
            with urllib.request.urlopen(peticion, timeout=8) as respuesta:
                _cache["eventos"] = parsear_ics(respuesta.read().decode("utf-8", "replace"))
            _cache["hasta"] = ahora + CACHE_SEGUNDOS
        except Exception:  # noqa: BLE001 -- Luma caído no puede tumbar el Inicio
            logger.warning("No se pudo leer el calendario de Luma", exc_info=True)
            _cache["hasta"] = ahora + 60
    corte = datetime.now(timezone.utc).isoformat()
    return [e for e in _cache["eventos"] if e["inicio"] >= corte]
