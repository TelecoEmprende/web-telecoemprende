"""Lo que es de todo el club y no de un departamento: la Mesa del club
(proyectos vivos, tareas sin dueño y atrasadas), el historial de cambios y la
papelera.

Cuelga de `/api/equipo`, como las Notas: cualquiera con sesión puede leer,
y cualquiera puede restaurar lo que se borró. Vaciar la papelera a mano es
solo de admin; a los 30 días se vacía sola (ver `api/cron.py`).
"""

from flask import Blueprint, jsonify, request

from backend.api.marketing import DatosInvalidos, es_cargo_vp_o_admin
from backend.api.sesion import requiere_sesion
from backend.schemas import build_response
from backend.services import historial
from backend.services.admin import is_admin_authenticated
from backend.services.equipo import equipo_session_info
from backend.services.marketing import mesa_del_club

club_api = Blueprint("club_api", __name__, url_prefix="/api/equipo")


@club_api.route("/mesa", methods=["GET"])
@requiere_sesion
def api_mesa():
    yo = equipo_session_info()["email"]
    return jsonify({
        "ok": True,
        "mesa": mesa_del_club(),
        "actividad": historial.listar(yo, limite=15, directiva=es_cargo_vp_o_admin()),
    }), 200


def _entero(valor: str | None) -> int | None:
    if valor in (None, ""):
        return None
    try:
        return int(valor)
    except ValueError:
        raise DatosInvalidos("Número no válido.") from None


@club_api.route("/historial", methods=["GET"])
@requiere_sesion
def api_historial():
    """`?entidad=tarea&id=7` (lo de una cosa), `?proyecto_id=3` (lo de un
    proyecto y todo lo que cuelga de él) o sin filtro (lo último del club)."""
    yo = equipo_session_info()["email"]
    entidad = request.args.get("entidad")
    if entidad is not None and entidad not in historial.TABLAS:
        raise DatosInvalidos("Tipo no válido.")
    eventos = historial.listar(
        yo,
        entidad=entidad,
        entidad_id=_entero(request.args.get("id")),
        proyecto_id=_entero(request.args.get("proyecto_id")),
        limite=_entero(request.args.get("limite")) or 50,
        directiva=es_cargo_vp_o_admin(),
    )
    return jsonify({"ok": True, "eventos": eventos}), 200


@club_api.route("/papelera", methods=["GET"])
@requiere_sesion
def api_papelera():
    yo = equipo_session_info()["email"]
    return jsonify({
        "ok": True,
        "dias": historial.DIAS_EN_PAPELERA,
        "elementos": historial.listar_papelera(yo, es_cargo_vp_o_admin()),
    }), 200


@club_api.route("/papelera/<entidad>/<int:fila_id>/restaurar", methods=["POST"])
@requiere_sesion
def api_restaurar(entidad: str, fila_id: int):
    yo = equipo_session_info()["email"]
    if entidad not in historial.TABLAS:
        raise DatosInvalidos("Tipo no válido.")
    if not historial.restaurar(entidad, fila_id, yo, es_cargo_vp_o_admin()):
        return jsonify(build_response(False, "No está en la papelera.")), 404
    return jsonify(build_response(True, "Restaurado.")), 200


@club_api.route("/papelera/<entidad>/<int:fila_id>", methods=["DELETE"])
@requiere_sesion
def api_vaciar(entidad: str, fila_id: int):
    """Borrado definitivo de una cosa: solo admin."""
    if not is_admin_authenticated():
        return jsonify(build_response(False, "Solo un admin puede borrar definitivamente.")), 403
    if entidad not in historial.TABLAS:
        raise DatosInvalidos("Tipo no válido.")
    if historial.vaciar_papelera(entidad, fila_id) == 0:
        return jsonify(build_response(False, "No está en la papelera.")), 404
    return jsonify(build_response(True, "Borrado para siempre.")), 200
