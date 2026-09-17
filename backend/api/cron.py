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
from backend.services.marketing import init_marketing_db, salud_equipo, tareas_que_vencen
from backend.services.slack import aviso_deadlines_manana, resumen_salud_equipo

logger = logging.getLogger("telecoemprende.cron")

cron_api = Blueprint("cron_api", __name__, url_prefix="/api/cron")


def _autorizado() -> bool:
    # Sin CRON_SECRET configurado, la ruta no se puede activar por accidente
    # -- ni con un header vacío ni con uno adivinado.
    return bool(CRON_SECRET) and request.headers.get("Authorization") == f"Bearer {CRON_SECRET}"


@cron_api.route("/avisar-deadlines", methods=["POST"])
def api_avisar_deadlines():
    """Un aviso a Slack por cada tarea (de cualquier departamento) que vence
    mañana y sigue sin acabar. Pensado para correr una vez al día."""
    if not _autorizado():
        return jsonify(build_response(False, "No autorizado.")), 401

    init_marketing_db()
    mañana = date.today() + timedelta(days=1)
    tareas = tareas_que_vencen(mañana)
    enviado = aviso_deadlines_manana(tareas)
    logger.info("cron avisar-deadlines: %s tarea(s), enviado=%s", len(tareas), enviado)
    return jsonify({"ok": True, "tareas": len(tareas), "enviado": enviado}), 200


@cron_api.route("/resumen-equipo", methods=["POST"])
def api_resumen_equipo():
    """Un resumen de salud por departamento, una vez a la semana. Se salta el
    que no tiene miembros -- no hay a quién avisar de qué."""
    if not _autorizado():
        return jsonify(build_response(False, "No autorizado.")), 401

    init_marketing_db()
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

    logger.info("cron resumen-equipo: %s", enviados)
    return jsonify({"ok": True, "enviados": enviados}), 200
