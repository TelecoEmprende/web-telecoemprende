"""API del espacio de Marketing dentro de /equipo.

Autorización: reutiliza la sesión que ya monta `login_equipo` (no hay un
sistema de auth paralelo). Cada ruta pasa por `@requiere_equipo("marketing")`,
que exige pertenecer al equipo -- comprobado en servidor, nunca confiando en
que el frontend haya escondido el botón.
"""

import logging
import re
from datetime import date, datetime, timedelta
from functools import wraps

from flask import Blueprint, Response, jsonify, request, url_for

from backend.config import (
    CONTENT_ESTADOS,
    MAX_ENLACES,
    MAX_RESPONSABLES,
    MAX_TEXTO_LARGO_LEN,
    MAX_TITULO_LEN,
    TASK_ESTADOS,
    TASK_PRIORIDADES,
)
from backend.schemas import build_response
from backend.services.admin import is_admin_authenticated
from backend.services.equipo import (
    equipo_session_info,
    equipos_por_token_calendario,
    is_equipo_authenticated,
    token_calendario,
)
from backend.services.marketing import (
    actualizar_campaign,
    actualizar_content,
    actualizar_task,
    calendario,
    calendario_ics,
    crear_campaign,
    crear_content,
    crear_task,
    eliminar_campaign,
    eliminar_content,
    eliminar_task,
    init_marketing_db,
    listar_campaigns,
    listar_tasks,
    obtener_campaign,
    obtener_content,
    obtener_task,
)

logger = logging.getLogger("telecoemprende.marketing")

# Caracteres de control (menos tab y salto de línea): no aportan nada y
# ensucian tanto la base de datos como los exports.
_CONTROL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


def _sanear(texto: str, *, multilinea: bool = False) -> str:
    """Limpieza para los textos de Marketing.

    Deliberadamente NO usa `services.security.limpiar_texto`, que hace
    `escape()` y aplasta los saltos de línea. Eso es correcto para el
    formulario de inscripción (su texto acaba en un Excel), pero aquí rompe
    dos cosas: un guion con comillas se guardaría como `&quot;` y React lo
    pintaría tal cual -- React escapa al renderizar, no desescapa --, y un
    guion multilínea se convertiría en un párrafo de una sola línea.

    Contra XSS ya protegen el escapado de React al pintar y la CSP; contra
    inyección SQL, las consultas parametrizadas de psycopg2. Escapar aquí no
    añade seguridad, solo corrompe el contenido.
    """
    texto = _CONTROL.sub("", texto)

    if not multilinea:
        return " ".join(texto.split())

    lineas = texto.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    return "\n".join(" ".join(linea.split()) for linea in lineas).strip()


marketing_api = Blueprint("marketing_api", __name__, url_prefix="/api/marketing")

DEPARTAMENTO = "marketing"


class DatosInvalidos(ValueError):
    """Error de validación con el mensaje que se le enseña al usuario."""


def requiere_equipo(equipo: str):
    """Exige pertenecer a `equipo`. El admin pasa siempre: el equipo de
    ingeniería recibe `admin_auth` al entrar en /equipo y hace de superusuario."""

    def decorador(func):
        @wraps(func)
        def envoltorio(*args, **kwargs):
            autorizado = is_admin_authenticated() or (
                is_equipo_authenticated() and equipo in equipo_session_info()["teams"]
            )
            if not autorizado:
                return jsonify(build_response(False, "No autorizado.")), 401

            init_marketing_db()
            try:
                return func(*args, **kwargs)
            except DatosInvalidos as error:
                return jsonify(build_response(False, str(error))), 400

        return envoltorio

    return decorador


# --------------------------------------------------------------------------
# Validación de entrada
# --------------------------------------------------------------------------

def _payload() -> dict:
    datos = request.get_json(silent=True)
    if not isinstance(datos, dict):
        raise DatosInvalidos("El cuerpo de la petición debe ser un objeto JSON.")
    return datos


def _texto(
    datos: dict,
    clave: str,
    *,
    obligatorio=False,
    maximo=MAX_TITULO_LEN,
    multilinea=False,
) -> str:
    valor = _sanear(str(datos.get(clave, "") or ""), multilinea=multilinea)
    if obligatorio and not valor:
        raise DatosInvalidos(f"El campo '{clave}' es obligatorio.")
    if len(valor) > maximo:
        raise DatosInvalidos(f"El campo '{clave}' supera los {maximo} caracteres.")
    return valor


def _fecha(datos: dict, clave: str) -> date | None:
    valor = datos.get(clave)
    if valor in (None, ""):
        return None
    try:
        return datetime.strptime(str(valor), "%Y-%m-%d").date()
    except ValueError:
        raise DatosInvalidos(f"'{clave}' debe tener formato AAAA-MM-DD.") from None


def _lista_textos(datos: dict, clave: str, maximo: int) -> list[str]:
    valor = datos.get(clave, [])
    if not isinstance(valor, list):
        raise DatosInvalidos(f"'{clave}' debe ser una lista.")
    if len(valor) > maximo:
        raise DatosInvalidos(f"'{clave}' admite como mucho {maximo} elementos.")
    limpios = [_sanear(str(v)) for v in valor]
    return [v for v in limpios if v]


def _opcion(datos: dict, clave: str, validas: tuple, por_defecto: str) -> str:
    valor = str(datos.get(clave, "") or por_defecto)
    if valor not in validas:
        raise DatosInvalidos(
            f"'{clave}' no es válido. Valores permitidos: {', '.join(validas)}."
        )
    return valor


def _checklist(datos: dict) -> list[dict]:
    """Lista de {texto, hecho}. Se normaliza aquí para que en base de datos
    nunca haya un JSON con forma distinta a la que espera el frontend."""
    valor = datos.get("checklist", [])
    if not isinstance(valor, list):
        raise DatosInvalidos("'checklist' debe ser una lista.")
    if len(valor) > 50:
        raise DatosInvalidos("La checklist admite como mucho 50 elementos.")

    items = []
    for item in valor:
        if not isinstance(item, dict):
            raise DatosInvalidos("Cada elemento de la checklist debe ser un objeto.")
        texto = _sanear(str(item.get("texto", "")))
        if not texto:
            continue
        items.append({"texto": texto[:MAX_TITULO_LEN], "hecho": bool(item.get("hecho"))})
    return items


def _autor() -> str:
    from flask import session

    return session.get("equipo_email", "admin")


# --------------------------------------------------------------------------
# Campaigns
# --------------------------------------------------------------------------

@marketing_api.route("/campaigns", methods=["GET"])
@requiere_equipo(DEPARTAMENTO)
def api_listar_campaigns():
    return jsonify({"ok": True, "campaigns": listar_campaigns()}), 200


@marketing_api.route("/campaigns", methods=["POST"])
@requiere_equipo(DEPARTAMENTO)
def api_crear_campaign():
    datos = _payload()
    campaign = crear_campaign(
        nombre=_texto(datos, "nombre", obligatorio=True),
        objetivo=_texto(datos, "objetivo", maximo=MAX_TEXTO_LARGO_LEN),
        audiencia=_texto(datos, "audiencia", maximo=MAX_TEXTO_LARGO_LEN),
        fecha=_fecha(datos, "fecha"),
        creado_por=_autor(),
    )
    logger.info("marketing crea campaign id=%s", campaign["id"])
    return jsonify(build_response(True, "Campaña creada.", campaign=campaign)), 201


@marketing_api.route("/campaigns/<int:campaign_id>", methods=["GET"])
@requiere_equipo(DEPARTAMENTO)
def api_obtener_campaign(campaign_id: int):
    campaign = obtener_campaign(campaign_id)
    if campaign is None:
        return jsonify(build_response(False, "Campaña no encontrada.")), 404
    return jsonify({"ok": True, "campaign": campaign}), 200


@marketing_api.route("/campaigns/<int:campaign_id>", methods=["PUT"])
@requiere_equipo(DEPARTAMENTO)
def api_actualizar_campaign(campaign_id: int):
    datos = _payload()
    campos = {}
    if "nombre" in datos:
        campos["nombre"] = _texto(datos, "nombre", obligatorio=True)
    if "objetivo" in datos:
        campos["objetivo"] = _texto(datos, "objetivo", maximo=MAX_TEXTO_LARGO_LEN)
    if "audiencia" in datos:
        campos["audiencia"] = _texto(datos, "audiencia", maximo=MAX_TEXTO_LARGO_LEN)
    if "fecha" in datos:
        campos["fecha"] = _fecha(datos, "fecha")

    if not actualizar_campaign(campaign_id, **campos):
        return jsonify(build_response(False, "Campaña no encontrada o sin cambios.")), 404
    return jsonify(build_response(True, "Campaña actualizada.")), 200


@marketing_api.route("/campaigns/<int:campaign_id>", methods=["DELETE"])
@requiere_equipo(DEPARTAMENTO)
def api_eliminar_campaign(campaign_id: int):
    if not eliminar_campaign(campaign_id):
        return jsonify(build_response(False, "Campaña no encontrada.")), 404
    logger.info("marketing elimina campaign id=%s", campaign_id)
    return jsonify(build_response(True, "Campaña eliminada.")), 200


# --------------------------------------------------------------------------
# Contents
# --------------------------------------------------------------------------

def _campos_content(datos: dict, *, parcial: bool) -> dict:
    campos = {}

    def incluir(clave):
        return not parcial or clave in datos

    if incluir("titulo"):
        campos["titulo"] = _texto(datos, "titulo", obligatorio=True)
    if incluir("tipo"):
        campos["tipo"] = _texto(datos, "tipo", maximo=20)
    if incluir("plataforma"):
        campos["plataforma"] = _texto(datos, "plataforma", maximo=20)
    if incluir("fecha_publicacion"):
        campos["fecha_publicacion"] = _fecha(datos, "fecha_publicacion")
    if incluir("estado"):
        campos["estado"] = _opcion(datos, "estado", CONTENT_ESTADOS, "idea")
    for clave in ("script", "copy_texto", "idea_visual"):
        if incluir(clave):
            campos[clave] = _texto(
                datos, clave, maximo=MAX_TEXTO_LARGO_LEN, multilinea=True
            )
    if incluir("cta"):
        campos["cta"] = _texto(datos, "cta", maximo=200)
    if incluir("hashtags"):
        campos["hashtags"] = _texto(datos, "hashtags", maximo=MAX_TEXTO_LARGO_LEN)
    if incluir("responsables"):
        campos["responsables"] = _lista_textos(datos, "responsables", MAX_RESPONSABLES)
    if incluir("enlaces"):
        campos["enlaces"] = _lista_textos(datos, "enlaces", MAX_ENLACES)
    return campos


@marketing_api.route("/campaigns/<int:campaign_id>/contents", methods=["POST"])
@requiere_equipo(DEPARTAMENTO)
def api_crear_content(campaign_id: int):
    datos = _payload()
    content = crear_content(campaign_id, **_campos_content(datos, parcial=False))
    if content is None:
        return jsonify(build_response(False, "Campaña no encontrada.")), 404
    logger.info("marketing crea content id=%s campaign=%s", content["id"], campaign_id)
    return jsonify(build_response(True, "Contenido creado.", content=content)), 201


@marketing_api.route("/contents/<int:content_id>", methods=["GET"])
@requiere_equipo(DEPARTAMENTO)
def api_obtener_content(content_id: int):
    content = obtener_content(content_id)
    if content is None:
        return jsonify(build_response(False, "Contenido no encontrado.")), 404
    return jsonify({"ok": True, "content": content}), 200


@marketing_api.route("/contents/<int:content_id>", methods=["PUT"])
@requiere_equipo(DEPARTAMENTO)
def api_actualizar_content(content_id: int):
    campos = _campos_content(_payload(), parcial=True)
    if not actualizar_content(content_id, **campos):
        return jsonify(build_response(False, "Contenido no encontrado o sin cambios.")), 404
    return jsonify(build_response(True, "Contenido actualizado.")), 200


@marketing_api.route("/contents/<int:content_id>", methods=["DELETE"])
@requiere_equipo(DEPARTAMENTO)
def api_eliminar_content(content_id: int):
    if not eliminar_content(content_id):
        return jsonify(build_response(False, "Contenido no encontrado.")), 404
    logger.info("marketing elimina content id=%s", content_id)
    return jsonify(build_response(True, "Contenido eliminado.")), 200


# --------------------------------------------------------------------------
# Tasks
# --------------------------------------------------------------------------

@marketing_api.route("/tasks", methods=["GET"])
@requiere_equipo(DEPARTAMENTO)
def api_listar_tasks():
    # `usuario` viaja aquí para que el panel pueda filtrar "solo lo mío" sin
    # tocar /api/equipo/session, que es de otro miembro del equipo.
    return jsonify({
        "ok": True,
        "tasks": listar_tasks(DEPARTAMENTO),
        "usuario": _autor(),
    }), 200


@marketing_api.route("/tasks", methods=["POST"])
@requiere_equipo(DEPARTAMENTO)
def api_crear_task():
    datos = _payload()

    def id_opcional(clave):
        valor = datos.get(clave)
        if valor in (None, ""):
            return None
        if not isinstance(valor, int) or isinstance(valor, bool):
            raise DatosInvalidos(f"'{clave}' debe ser un número entero.")
        return valor

    task = crear_task(
        departamento=DEPARTAMENTO,
        campaign_id=id_opcional("campaign_id"),
        content_id=id_opcional("content_id"),
        titulo=_texto(datos, "titulo", obligatorio=True),
        descripcion=_texto(
            datos, "descripcion", maximo=MAX_TEXTO_LARGO_LEN, multilinea=True
        ),
        estado=_opcion(datos, "estado", TASK_ESTADOS, "pendiente"),
        prioridad=_opcion(datos, "prioridad", TASK_PRIORIDADES, "media"),
        deadline=_fecha(datos, "deadline"),
        responsables=_lista_textos(datos, "responsables", MAX_RESPONSABLES),
        tags=_lista_textos(datos, "tags", MAX_RESPONSABLES),
        checklist=_checklist(datos),
        enlaces=_lista_textos(datos, "enlaces", MAX_ENLACES),
        creado_por=_autor(),
    )
    if task is None:
        return jsonify(build_response(False, "Campaña o contenido no encontrado.")), 404

    logger.info("marketing crea task id=%s", task["id"])
    return jsonify(build_response(True, "Tarea creada.", task=task)), 201


@marketing_api.route("/tasks/<int:task_id>", methods=["GET"])
@requiere_equipo(DEPARTAMENTO)
def api_obtener_task(task_id: int):
    task = obtener_task(task_id)
    if task is None:
        return jsonify(build_response(False, "Tarea no encontrada.")), 404
    return jsonify({"ok": True, "task": task}), 200


@marketing_api.route("/tasks/<int:task_id>", methods=["PUT"])
@requiere_equipo(DEPARTAMENTO)
def api_actualizar_task(task_id: int):
    datos = _payload()
    campos = {}
    if "titulo" in datos:
        campos["titulo"] = _texto(datos, "titulo", obligatorio=True)
    if "descripcion" in datos:
        campos["descripcion"] = _texto(
            datos, "descripcion", maximo=MAX_TEXTO_LARGO_LEN, multilinea=True
        )
    if "estado" in datos:
        campos["estado"] = _opcion(datos, "estado", TASK_ESTADOS, "pendiente")
    if "prioridad" in datos:
        campos["prioridad"] = _opcion(datos, "prioridad", TASK_PRIORIDADES, "media")
    if "deadline" in datos:
        campos["deadline"] = _fecha(datos, "deadline")
    if "responsables" in datos:
        campos["responsables"] = _lista_textos(datos, "responsables", MAX_RESPONSABLES)
    if "tags" in datos:
        campos["tags"] = _lista_textos(datos, "tags", MAX_RESPONSABLES)
    if "checklist" in datos:
        campos["checklist"] = _checklist(datos)
    if "enlaces" in datos:
        campos["enlaces"] = _lista_textos(datos, "enlaces", MAX_ENLACES)

    if not actualizar_task(task_id, **campos):
        return jsonify(build_response(False, "Tarea no encontrada o sin cambios.")), 404
    return jsonify(build_response(True, "Tarea actualizada.")), 200


@marketing_api.route("/tasks/<int:task_id>", methods=["DELETE"])
@requiere_equipo(DEPARTAMENTO)
def api_eliminar_task(task_id: int):
    if not eliminar_task(task_id):
        return jsonify(build_response(False, "Tarea no encontrada.")), 404
    logger.info("marketing elimina task id=%s", task_id)
    return jsonify(build_response(True, "Tarea eliminada.")), 200


# --------------------------------------------------------------------------
# Calendario
# --------------------------------------------------------------------------

@marketing_api.route("/calendario", methods=["GET"])
@requiere_equipo(DEPARTAMENTO)
def api_calendario():
    """`?desde=AAAA-MM-DD&hasta=AAAA-MM-DD`. Sin parámetros, el mes en curso."""
    args = request.args.to_dict()
    hoy = date.today()

    desde = _fecha(args, "desde") or hoy.replace(day=1)
    hasta = _fecha(args, "hasta")
    if hasta is None:
        # Último día del mes de `desde`: saltar al mes siguiente y restar sus días.
        siguiente_mes = desde.replace(day=28) + timedelta(days=4)
        hasta = siguiente_mes - timedelta(days=siguiente_mes.day)

    if hasta < desde:
        return jsonify(build_response(False, "'hasta' no puede ser anterior a 'desde'.")), 400

    return jsonify({
        "ok": True,
        "desde": desde.isoformat(),
        "hasta": hasta.isoformat(),
        "items": calendario(desde, hasta),
    }), 200


@marketing_api.route("/calendario/enlace", methods=["GET"])
@requiere_equipo(DEPARTAMENTO)
def api_calendario_enlace():
    """URL de suscripción (.ics) para el calendario de Marketing, firmada para
    este email: se pega en "Añadir por URL" de Google Calendar (o el que sea)
    y se actualiza sola, sin volver a iniciar sesión ni pasar por OAuth."""
    email = _autor()
    url = url_for(
        "marketing_api.api_calendario_ics",
        email=email,
        token=token_calendario(email),
        _external=True,
    )
    return jsonify({"ok": True, "url": url}), 200


@marketing_api.route("/calendario.ics", methods=["GET"])
def api_calendario_ics():
    """Sin sesión: un calendario externo solo hace GET periódicos a esta URL,
    sin cookies. La autorización va en la firma del enlace (`?token=`), no en
    `@requiere_equipo`."""
    email = request.args.get("email", "")
    equipos = equipos_por_token_calendario(email, request.args.get("token", ""))
    if equipos is None or DEPARTAMENTO not in equipos:
        return "No autorizado.", 401

    init_marketing_db()
    hoy = date.today()
    contenido = calendario_ics(hoy - timedelta(days=30), hoy + timedelta(days=180))
    return Response(contenido, mimetype="text/calendar")


# --------------------------------------------------------------------------
# Miembros del departamento
# --------------------------------------------------------------------------

@marketing_api.route("/miembros", methods=["GET"])
@requiere_equipo(DEPARTAMENTO)
def api_miembros():
    """Compañeros del departamento, leídos de `equipo_accesos` (tabla de Hammad,
    solo lectura). Hoy solo hay email: nombre/apellidos/foto llegarán cuando se
    acuerde ampliar esa tabla."""
    from backend.services.equipo import init_equipo_db, listar_equipo_accesos

    init_equipo_db()
    miembros = [
        {"email": a["email"], "equipos": a["equipos"], "activo": a["activo"]}
        for a in listar_equipo_accesos()
        if DEPARTAMENTO in a["equipos"] and a["activo"]
    ]
    return jsonify({"ok": True, "miembros": miembros}), 200
