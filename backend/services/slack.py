"""Avisos a Slack por Incoming Webhook.

Sin OAuth, sin app de Slack, sin backend nuevo: una URL en `SLACK_WEBHOOK_URL`
y un POST. Si la variable no está configurada, no se envía nada y no pasa nada
-- igual que `services/email.py`, un fallo de aviso nunca puede tumbar la
operación que lo dispara.
"""

import json
import logging
import urllib.error
import urllib.parse
import urllib.request
from datetime import date
from functools import lru_cache

from backend.config import SLACK_BOT_TOKEN, SLACK_WEBHOOK_URL

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


def responder_en_hilo(canal: str, hilo: str, texto: str) -> bool:
    """Contesta en un canal/hilo concreto vía Web API (`chat.postMessage`),
    a diferencia de `enviar` que solo publica en el canal fijo del webhook.
    La usa el bot de dudas -- ver `api/slack_bot.py`."""
    if not SLACK_BOT_TOKEN:
        return False

    peticion = urllib.request.Request(
        "https://slack.com/api/chat.postMessage",
        data=json.dumps({"channel": canal, "thread_ts": hilo, "text": texto}).encode("utf-8"),
        headers={
            "Content-Type": "application/json; charset=utf-8",
            "Authorization": f"Bearer {SLACK_BOT_TOKEN}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(peticion, timeout=10) as resp:
            data = json.loads(resp.read())
            if not data.get("ok"):
                logger.error("chat.postMessage rechazado: %s", data.get("error"))
            return bool(data.get("ok"))
    except (urllib.error.URLError, urllib.error.HTTPError, OSError) as exc:
        logger.error("fallo respondiendo en Slack: %s", exc)
        return False


def _quien(email: str) -> str:
    """El nombre de pila basta: en el canal del club nadie se llama igual."""
    return email.split("@")[0] if email else "alguien"


# ponytail: caché en memoria del proceso (se pierde en cada arranque en frío y
# también guarda los fallos); si las búsquedas pesan, guardar el id en `members`.
@lru_cache(maxsize=512)
def _id_de_slack(email: str) -> str:
    """El usuario de Slack con ese correo (`users.lookupByEmail`, necesita el
    permiso `users:read.email` en la app del bot), o "" si no hay token, no
    existe o Slack no contesta."""
    if not SLACK_BOT_TOKEN or not email:
        return ""
    peticion = urllib.request.Request(
        "https://slack.com/api/users.lookupByEmail?" + urllib.parse.urlencode({"email": email}),
        headers={"Authorization": f"Bearer {SLACK_BOT_TOKEN}"},
    )
    try:
        with urllib.request.urlopen(peticion, timeout=3) as resp:
            data = json.loads(resp.read())
    except (urllib.error.URLError, urllib.error.HTTPError, OSError, ValueError) as exc:
        logger.error("fallo buscando a %s en Slack: %s", email, exc)
        return ""
    return data.get("user", {}).get("id", "") if data.get("ok") else ""


def _mencion(email: str) -> str:
    """A quien le toca algo (responsable, asistente): mencionado, para que le
    llegue el aviso aunque no mire el canal. Sin cuenta en Slack, su nombre."""
    slack_id = _id_de_slack(email.lower()) if email else ""
    return f"<@{slack_id}>" if slack_id else _quien(email)


_DIAS = ("lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo")
_MESES = ("ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic")


def _cuando(fecha: str, hora: str = "") -> str:
    """«jueves 22 oct · 18:00» a partir de la fecha ISO de la reunión."""
    try:
        dia = date.fromisoformat(fecha)
    except (TypeError, ValueError):
        return "sin fecha"
    texto = f"{_DIAS[dia.weekday()]} {dia.day} {_MESES[dia.month - 1]}"
    return f"{texto} · {hora}" if hora else texto


_AMBITO = {"": "todo el club", "directiva": "directiva", "marketing": "Marketing",
           "eventos": "Eventos", "ingenieria": "Ingeniería", "administrativo": "Administrativo"}


def _tablero(departamento: str) -> str:
    """«Marketing», «Administrativo»...: el nombre que se ve, no el valor guardado."""
    return _AMBITO.get(departamento, departamento)


def tarea_creada(tarea: dict, departamento: str, autor: str) -> bool:
    responsables = ", ".join(_mencion(r) for r in tarea.get("responsables") or [])
    linea = (
        f":pushpin: *{_quien(autor)}* ha creado una tarea en *{_tablero(departamento)}*: "
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
        f"{emoji} *{tarea.get('titulo', '')}* ({_tablero(departamento)}) pasa a *{etiqueta}*"
        f" — {_quien(autor)}"
    )


def aviso_deadlines_manana(tareas: list[dict]) -> bool:
    """Un aviso, todos los departamentos juntos -- son pocas tareas por día,
    no hace falta un mensaje por departamento (ni el canal del webhook tiene
    por qué ser distinto para cada uno)."""
    if not tareas:
        return False

    lineas = [":alarm_clock: *Vence mañana:*"]
    for tarea in tareas:
        responsables = ", ".join(_mencion(r) for r in tarea.get("responsables") or [])
        linea = f"• *{tarea.get('titulo', '')}* ({_tablero(tarea.get('departamento', ''))})"
        if responsables:
            linea += f" — {responsables}"
        lineas.append(linea)

    return enviar("\n".join(lineas))


def tarea_comentada(tarea: dict, texto: str, departamento: str, autor: str) -> bool:
    responsables = ", ".join(_mencion(r) for r in tarea.get("responsables") or [] if r != autor)
    resumen = texto if len(texto) <= 200 else texto[:200] + "…"
    linea = (
        f":speech_balloon: *{_quien(autor)}* comenta en *{tarea.get('titulo', '')}* "
        f"({_tablero(departamento)})"
    )
    if responsables:
        linea += f"\n> Para: {responsables}"
    linea += f"\n> {resumen}"
    return enviar(linea)


def resumen_salud_equipo(salud: dict, departamento: str) -> bool:
    """Resumen semanal (cron de los lunes, ver `api/cron.py`), no una acción
    de alguien -- por eso no lleva firma de autor como el resto de avisos."""
    pct = salud.get("pct_a_tiempo")
    a_tiempo = f"{pct}% de las tareas acabadas a tiempo" if pct is not None else "sin tareas acabadas con plazo"
    return enviar(
        f":bar_chart: *Salud de {_tablero(departamento)}*: {salud['sobrecargados']} sobrecargado(s), "
        f"{salud['inactivos']} inactivo(s) +15 días, {a_tiempo}"
    )


def resumen_mesa(mesa: dict) -> bool:
    """El resumen del lunes para la reunión semanal: lo atrasado, lo que no
    tiene dueño y los proyectos que no se mueven. Sin nada que contar no
    manda nada: un «todo en orden» cada lunes acaba silenciado."""
    atrasadas = mesa.get("atrasadas", [])
    sin_dueno = mesa.get("sin_dueno", [])
    estancados = [p for p in mesa.get("proyectos", []) if p.get("estancado")]
    sin_responsable = [p for p in mesa.get("proyectos", []) if not p.get("responsable")]
    if not (atrasadas or sin_dueno or estancados or sin_responsable):
        return False

    lineas = [":calendar: *Mesa del club — lo que toca mirar esta semana*"]
    if atrasadas:
        lineas.append(f":rotating_light: *{len(atrasadas)} tarea(s) atrasada(s):*")
        for t in atrasadas[:8]:
            quien = ", ".join(_mencion(r) for r in t.get("responsables") or []) or "sin dueño"
            lineas.append(f"• {t['titulo']} ({_tablero(t['departamento'])}) — {quien}, venció el {t['deadline']}")
    if sin_dueno:
        lineas.append(f":raising_hand: *{len(sin_dueno)} tarea(s) sin dueño* — ¿quién se la queda?")
        for t in sin_dueno[:8]:
            lineas.append(f"• {t['titulo']} ({_tablero(t['departamento'])})")
    if estancados:
        lineas.append(f":hourglass: *{len(estancados)} proyecto(s) sin moverse* en {mesa.get('dias_estancado', 14)}+ días:")
        for p in estancados[:8]:
            lineas.append(f"• {p['nombre']} — {p.get('responsable') and _mencion(p['responsable']) or 'sin responsable'}")
    if sin_responsable:
        lineas.append(
            f":bust_in_silhouette: *{len(sin_responsable)} proyecto(s) sin responsable:* "
            + ", ".join(p["nombre"] for p in sin_responsable[:8])
        )
    return enviar("\n".join(lineas))


def _lineas_reunion(reunion: dict) -> list[str]:
    lineas = []
    if reunion.get("objetivo"):
        objetivo = reunion["objetivo"]
        lineas.append(f"> {objetivo if len(objetivo) <= 200 else objetivo[:200] + '…'}")
    if reunion.get("asistentes"):
        lineas.append("> Convocados: " + ", ".join(_mencion(a) for a in reunion["asistentes"]))
    return lineas


def reunion_convocada(reunion: dict, autor: str) -> bool:
    """Al convocar una reunión con fecha. Las de la directiva que solo ve ella
    no se anuncian: el canal es de todo el club."""
    if reunion.get("solo_directiva") or not reunion.get("fecha"):
        return False
    ambito = _AMBITO.get(reunion.get("departamento", ""), reunion.get("departamento", ""))
    cabecera = (
        f":date: *{_quien(autor)}* convoca *{reunion.get('titulo', '')}* ({ambito}): "
        f"{_cuando(reunion['fecha'], reunion.get('hora', ''))}"
    )
    return enviar("\n".join([cabecera, *_lineas_reunion(reunion)]))


def aviso_reuniones_manana(reuniones: list[dict]) -> bool:
    """Recordatorio del día antes, junto con el de tareas del cron diario."""
    publicas = [r for r in reuniones if not r.get("solo_directiva")]
    if not publicas:
        return False
    lineas = [":bell: *Mañana hay reunión:*"]
    for r in publicas:
        ambito = _AMBITO.get(r.get("departamento", ""), r.get("departamento", ""))
        lineas.append(f"• *{r.get('titulo', '')}* ({ambito}) — {_cuando(r['fecha'], r.get('hora', ''))}")
        lineas += ["  " + linea for linea in _lineas_reunion(r)]
    return enviar("\n".join(lineas))
