"""Rutas de Notas (`/api/equipo/notas`).

Blueprint propio con el mismo prefijo que `equipo_api`: no son de un
departamento (ver `services/notas.py`), así que no pueden colgar de
`marketing_api`, y `equipo.py` ya es bastante largo.
"""

from functools import wraps

from flask import Blueprint, jsonify

from backend.api.marketing import DatosInvalidos, _payload, _texto
from backend.config import MAX_TITULO_LEN
from backend.schemas import build_response
from backend.services import notas as srv
from backend.services.equipo import equipo_session_info, is_equipo_authenticated

notas_api = Blueprint("notas_api", __name__, url_prefix="/api/equipo")

# Un documento de BlockNote con texto normal ocupa unos pocos KB; esto deja
# sitio para notas largas sin convertir la tabla en un almacén de ficheros.
MAX_CONTENIDO_LEN = 400_000
_ESQUEMAS_SEGUROS = ("http://", "https://", "mailto:")


def requiere_sesion(func):
    @wraps(func)
    def envoltorio(*args, **kwargs):
        if not is_equipo_authenticated():
            return jsonify(build_response(False, "No autorizado.")), 401
        sesion = equipo_session_info()
        try:
            return func(sesion["email"], sesion["teams"], *args, **kwargs)
        except DatosInvalidos as error:
            return jsonify(build_response(False, str(error))), 400

    return envoltorio


def _departamento(datos: dict, teams: list[str]) -> str:
    valor = str(datos.get("departamento") or "")
    if valor and valor not in teams:
        raise DatosInvalidos("Solo puedes guardar en tus departamentos o en el club.")
    return valor


def _enlaces_seguros(nodo) -> None:
    """Ningún `href`/`url` del documento puede ser `javascript:` ni `data:`:
    acaban en un `<a>` o un `<img>` que ve el resto del club."""
    if isinstance(nodo, list):
        for hijo in nodo:
            _enlaces_seguros(hijo)
    elif isinstance(nodo, dict):
        for clave, valor in nodo.items():
            if clave in ("href", "url") and isinstance(valor, str) and valor.strip():
                if not valor.strip().lower().startswith(_ESQUEMAS_SEGUROS):
                    raise DatosInvalidos("Los enlaces tienen que empezar por http(s):// o mailto:.")
            else:
                _enlaces_seguros(valor)


def _contenido(datos: dict) -> list:
    valor = datos.get("contenido")
    if not isinstance(valor, list):
        raise DatosInvalidos("'contenido' debe ser una lista de bloques.")
    if srv.tamano_json(valor) > MAX_CONTENIDO_LEN:
        raise DatosInvalidos("La nota es demasiado larga. Pártela en varias.")
    _enlaces_seguros(valor)
    return valor


def _campos_nota(datos: dict, teams: list[str]) -> dict:
    salida = {}
    if "titulo" in datos:
        salida["titulo"] = _texto(datos, "titulo", maximo=MAX_TITULO_LEN)
    if "contenido" in datos:
        salida["contenido"] = _contenido(datos)
    if "departamento" in datos:
        salida["departamento"] = _departamento(datos, teams)
    for clave in ("privada", "fijada"):
        if clave in datos:
            salida[clave] = bool(datos.get(clave))
    if "proyecto_id" in datos:
        salida["proyecto_id"] = _proyecto(datos.get("proyecto_id"))
    return salida


def _proyecto(valor) -> int | None:
    """Proyecto al que se enlaza la nota (null para desenlazarla)."""
    if valor is None:
        return None
    if isinstance(valor, bool) or not isinstance(valor, int) or valor <= 0:
        raise DatosInvalidos("Proyecto no válido.")
    if not srv.proyecto_existe(valor):
        raise DatosInvalidos("Ese proyecto no existe.")
    return valor


# --------------------------------------------------------------------------
# Notas
# --------------------------------------------------------------------------

@notas_api.route("/notas", methods=["GET"])
@requiere_sesion
def api_listar_notas(yo, teams):
    return jsonify({"ok": True, "notas": srv.listar_notas(yo, teams)}), 200


@notas_api.route("/notas", methods=["POST"])
@requiere_sesion
def api_crear_nota(yo, teams):
    campos = _campos_nota(_payload(), teams)
    nota = srv.crear_nota(campos, yo)
    return jsonify(build_response(True, "Nota creada.", nota=nota)), 201


@notas_api.route("/notas/<int:nota_id>", methods=["GET"])
@requiere_sesion
def api_obtener_nota(yo, teams, nota_id: int):
    nota = srv.obtener_nota(nota_id, yo, teams)
    if nota is None:
        return jsonify(build_response(False, "No encontrada.")), 404
    return jsonify({"ok": True, "nota": nota}), 200


@notas_api.route("/notas/<int:nota_id>", methods=["PUT"])
@requiere_sesion
def api_actualizar_nota(yo, teams, nota_id: int):
    campos = _campos_nota(_payload(), teams)
    if not campos:
        raise DatosInvalidos("No hay nada que actualizar.")
    if not srv.actualizar_nota(nota_id, campos, yo, teams):
        return jsonify(build_response(False, "No encontrada.")), 404
    return jsonify(build_response(True, "Guardada.")), 200


@notas_api.route("/notas/<int:nota_id>", methods=["DELETE"])
@requiere_sesion
def api_eliminar_nota(yo, teams, nota_id: int):
    if not srv.eliminar_nota(nota_id, yo, teams):
        return jsonify(build_response(False, "No encontrada.")), 404
    return jsonify(build_response(True, "Eliminada.")), 200
