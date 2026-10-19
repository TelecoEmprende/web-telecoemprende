"""Rutas que solo dispara Vercel Cron, nunca un navegador.

Autorización: la sesión de /equipo no pinta nada aquí -- un cron no manda
cookie. Se verifica el header que Vercel añade solo a la petición,
"Authorization: Bearer <CRON_SECRET>" (ver vercel.json > crons y
https://vercel.com/docs/cron-jobs/manage-cron-jobs).
"""

import logging
from datetime import date, timedelta

from flask import Blueprint, jsonify, request

from backend.config import CRON_SECRET, EQUIPOS_VALIDOS
from backend.schemas import build_response
from backend.services import auditoria, historial, registros
from backend.services.registrations import purgar_inscripciones_antiguas
from backend.services.marketing import mesa_del_club, salud_equipo, tareas_que_vencen
from backend.services.slack import (
    aviso_deadlines_manana,
    aviso_reuniones_manana,
    resumen_mesa,
    resumen_salud_equipo,
)

logger = logging.getLogger("telecoemprende.cron")

cron_api = Blueprint("cron_api", __name__, url_prefix="/api/cron")


def _autorizado() -> bool:
    # Sin CRON_SECRET configurado, la ruta no se puede activar por accidente
    # -- ni con un header vacío ni con uno adivinado.
    return bool(CRON_SECRET) and request.headers.get("Authorization") == f"Bearer {CRON_SECRET}"


@cron_api.route("/avisar-deadlines", methods=["POST"])
def api_avisar_deadlines():
    """Un aviso a Slack con las tareas (de cualquier departamento) que vencen
    mañana y siguen sin acabar, y otro con las reuniones de mañana. Pensado
    para correr una vez al día."""
    if not _autorizado():
        return jsonify(build_response(False, "No autorizado.")), 401

    mañana = date.today() + timedelta(days=1)
    tareas = tareas_que_vencen(mañana)
    enviado = aviso_deadlines_manana(tareas)
    logger.info("cron avisar-deadlines: %s tarea(s), enviado=%s", len(tareas), enviado)
    try:
        reuniones = registros.reuniones_del_dia(mañana)
        reuniones_enviado = aviso_reuniones_manana(reuniones)
    except Exception:
        logger.exception("cron avisar-deadlines: fallo con las reuniones de mañana")
        reuniones, reuniones_enviado = [], False

    # De paso, una vez al día, la limpieza: la papelera de más de 30 días y
    # los datos personales que ya han cumplido su plazo (auditoría e
    # inscripciones de hace más de un año). Un fallo en una no tapa el aviso,
    # que ya está enviado, ni las demás.
    borradas = {}
    for nombre, limpiar in (
        ("vaciadas", historial.vaciar_papelera),
        ("auditoria", auditoria.purgar_antigua),
        ("inscripciones", purgar_inscripciones_antiguas),
    ):
        try:
            borradas[nombre] = limpiar()
        except Exception:
            logger.exception("cron avisar-deadlines: fallo limpiando %s", nombre)
            borradas[nombre] = 0
    return jsonify({
        "ok": True, "tareas": len(tareas), "enviado": enviado,
        "reuniones": len(reuniones), "reuniones_enviado": reuniones_enviado, **borradas,
    }), 200


@cron_api.route("/resumen-equipo", methods=["POST"])
def api_resumen_equipo():
    """El resumen del lunes: la Mesa del club (atrasadas, sin dueño, proyectos
    estancados) y un resumen de salud por departamento. Se salta el
    departamento sin miembros -- no hay a quién avisar de qué."""
    if not _autorizado():
        return jsonify(build_response(False, "No autorizado.")), 401

    try:
        mesa_enviada = resumen_mesa(mesa_del_club())
    except Exception:
        logger.exception("cron resumen-equipo: fallo en la mesa del club")
        mesa_enviada = False

    enviados = {}
    for departamento in sorted(EQUIPOS_VALIDOS):
        # Un departamento que falle (p. ej. un hipo de la base de datos) no
        # debe impedir que se avise a los otros dos -- se registra y se sigue.
        try:
            salud = salud_equipo(departamento)
            if salud["total"] == 0:
                continue
            enviados[departamento] = resumen_salud_equipo(salud, departamento)
        except Exception:
            logger.exception("cron resumen-equipo: fallo en %s", departamento)

    logger.info("cron resumen-equipo: mesa=%s %s", mesa_enviada, enviados)
    return jsonify({"ok": True, "mesa": mesa_enviada, "enviados": enviados}), 200
