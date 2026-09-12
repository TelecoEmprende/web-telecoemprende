"""API del espacio de trabajo de un departamento dentro de /equipo.

Sirve a Marketing y a Eventos con las mismas rutas: el blueprint se registra
una vez por departamento (ver `app.py`) y `departamento_actual()` dice cuál es
el de la petición. Todas las consultas van acotadas por él, así que pasar el id
de una tarea de otro departamento no encuentra nada.

Autorización: reutiliza la sesión que ya monta `login_equipo` (no hay un
sistema de auth paralelo). Cada ruta pasa por `@requiere_equipo`, que exige
pertenecer al departamento de la ruta -- comprobado en servidor, nunca
confiando en que el frontend haya escondido el botón.
"""

import logging
import re
from datetime import date, datetime, timedelta
from functools import wraps

from flask import Blueprint, jsonify, request

from backend.config import (
    CONTENT_ESTADOS,
    MAX_COMENTARIO_LEN,
    MAX_ENLACES,
    MAX_RESPONSABLES,
    MAX_TEXTO_LARGO_LEN,
    MAX_TITULO_LEN,
    TASK_ESTADOS,
    TASK_PRIORIDADES,
)
from backend.schemas import build_response
from backend.services.admin import is_admin_authenticated
from backend.services.equipo import equipo_session_info, is_equipo_authenticated
from backend.services.slack import tarea_cambia_estado, tarea_creada
from backend.services.marketing import (
    actualizar_campaign,
    carga_por_miembro,
    crear_task_comment,
    ficha_miembro,
    actualizar_content,
    actualizar_task,
    calendario,
    crear_campaign,
    crear_content,
    crear_task,
    duplicar_campaign,
    eliminar_campaign,
    eliminar_content,
    eliminar_task,
    init_marketing_db,
    listar_campaigns,
    listar_task_comments,
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


# El mismo blueprint se registra una vez por departamento (ver `app.py`), con
# un `name` distinto cada vez. Así Marketing y Eventos comparten tablero,
# tareas y calendario sin duplicar 400 líneas de rutas: lo único que cambia es
# de qué departamento son las filas, y eso sale del nombre del registro.
_DEPARTAMENTO_POR_BLUEPRINT = {
    "marketing_api": "marketing",
    "eventos_api": "eventos",
    "ingenieria_api": "ingenieria",
}

marketing_api = Blueprint("marketing_api", __name__, url_prefix="/api/marketing")


def departamento_actual() -> str:
    return _DEPARTAMENTO_POR_BLUEPRINT[request.blueprint]


class DatosInvalidos(ValueError):
    """Error de validación con el mensaje que se le enseña al usuario."""


def requiere_equipo(func):
    """Exige pertenecer al departamento de la ruta. El admin pasa siempre: el
    equipo de ingeniería recibe `admin_auth` al entrar en /equipo y hace de
    superusuario."""

    @wraps(func)
    def envoltorio(*args, **kwargs):
        autorizado = is_admin_authenticated() or (
            is_equipo_authenticated()
            and departamento_actual() in equipo_session_info()["teams"]
        )
        if not autorizado:
            return jsonify(build_response(False, "No autorizado.")), 401

        init_marketing_db()
        try:
            return func(*args, **kwargs)
        except DatosInvalidos as error:
            return jsonify(build_response(False, str(error))), 400

    return envoltorio


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
@requiere_equipo
def api_listar_campaigns():
    return jsonify({"ok": True, "campaigns": listar_campaigns(departamento_actual())}), 200


@marketing_api.route("/campaigns", methods=["POST"])
@requiere_equipo
def api_crear_campaign():
    datos = _payload()
    campaign = crear_campaign(
        nombre=_texto(datos, "nombre", obligatorio=True),
        objetivo=_texto(datos, "objetivo", maximo=MAX_TEXTO_LARGO_LEN),
        audiencia=_texto(datos, "audiencia", maximo=MAX_TEXTO_LARGO_LEN),
        fecha=_fecha(datos, "fecha"),
        creado_por=_autor(),
        departamento=departamento_actual(),
    )
    logger.info("marketing crea campaign id=%s", campaign["id"])
    return jsonify(build_response(True, "Campaña creada.", campaign=campaign)), 201


@marketing_api.route("/campaigns/<int:campaign_id>", methods=["GET"])
@requiere_equipo
def api_obtener_campaign(campaign_id: int):
    campaign = obtener_campaign(campaign_id, departamento_actual())
    if campaign is None:
        return jsonify(build_response(False, "Campaña no encontrada.")), 404
    return jsonify({"ok": True, "campaign": campaign}), 200


@marketing_api.route("/campaigns/<int:campaign_id>", methods=["PUT"])
@requiere_equipo
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
    if "archivado" in datos:
        campos["archivado"] = bool(datos["archivado"])

    if not actualizar_campaign(campaign_id, departamento_actual(), **campos):
        return jsonify(build_response(False, "Campaña no encontrada o sin cambios.")), 404
    return jsonify(build_response(True, "Campaña actualizada.")), 200


@marketing_api.route("/campaigns/<int:campaign_id>", methods=["DELETE"])
@requiere_equipo
def api_eliminar_campaign(campaign_id: int):
    if not eliminar_campaign(campaign_id, departamento_actual()):
        return jsonify(build_response(False, "Campaña no encontrada.")), 404
    logger.info("marketing elimina campaign id=%s", campaign_id)
    return jsonify(build_response(True, "Campaña eliminada.")), 200


@marketing_api.route("/campaigns/<int:campaign_id>/duplicar", methods=["POST"])
@requiere_equipo
def api_duplicar_campaign(campaign_id: int):
    campaign = duplicar_campaign(campaign_id, departamento_actual(), _autor())
    if campaign is None:
        return jsonify(build_response(False, "Campaña no encontrada.")), 404
    logger.info("marketing duplica campaign id=%s -> id=%s", campaign_id, campaign["id"])
    return jsonify(build_response(True, "Campaña duplicada.", campaign=campaign)), 201


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
@requiere_equipo
def api_crear_content(campaign_id: int):
    datos = _payload()
    content = crear_content(
        campaign_id, departamento_actual(), **_campos_content(datos, parcial=False)
    )
    if content is None:
        return jsonify(build_response(False, "Campaña no encontrada.")), 404
    logger.info("marketing crea content id=%s campaign=%s", content["id"], campaign_id)
    return jsonify(build_response(True, "Contenido creado.", content=content)), 201


@marketing_api.route("/contents/<int:content_id>", methods=["GET"])
@requiere_equipo
def api_obtener_content(content_id: int):
    content = obtener_content(content_id, departamento_actual())
    if content is None:
        return jsonify(build_response(False, "Contenido no encontrado.")), 404
    return jsonify({"ok": True, "content": content}), 200


@marketing_api.route("/contents/<int:content_id>", methods=["PUT"])
@requiere_equipo
def api_actualizar_content(content_id: int):
    campos = _campos_content(_payload(), parcial=True)
    if not actualizar_content(content_id, departamento_actual(), **campos):
        return jsonify(build_response(False, "Contenido no encontrado o sin cambios.")), 404
    return jsonify(build_response(True, "Contenido actualizado.")), 200


@marketing_api.route("/contents/<int:content_id>", methods=["DELETE"])
@requiere_equipo
def api_eliminar_content(content_id: int):
    if not eliminar_content(content_id, departamento_actual()):
        return jsonify(build_response(False, "Contenido no encontrado.")), 404
    logger.info("marketing elimina content id=%s", content_id)
    return jsonify(build_response(True, "Contenido eliminado.")), 200


# --------------------------------------------------------------------------
# Tasks
# --------------------------------------------------------------------------

@marketing_api.route("/tasks", methods=["GET"])
@requiere_equipo
def api_listar_tasks():
    # `usuario` viaja aquí para que el panel pueda filtrar "solo lo mío" sin
    # tocar /api/equipo/session, que es de otro miembro del equipo.
    return jsonify({
        "ok": True,
        "tasks": listar_tasks(departamento_actual()),
        "usuario": _autor(),
    }), 200


@marketing_api.route("/tasks", methods=["POST"])
@requiere_equipo
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
        departamento=departamento_actual(),
        campaign_id=id_opcional("campaign_id"),
        content_id=id_opcional("content_id"),
        titulo=_texto(datos, "titulo", obligatorio=True),
        descripcion=_texto(
            datos, "descripcion", maximo=MAX_TEXTO_LARGO_LEN, multilinea=True
        ),
        estado=_opcion(datos, "estado", TASK_ESTADOS, "pendiente"),
        prioridad=_opcion(datos, "prioridad", TASK_PRIORIDADES, "media"),
        deadline=_fecha(datos, "deadline"),
        hora=_texto(datos, "hora", maximo=5),
        responsables=_lista_textos(datos, "responsables", MAX_RESPONSABLES),
        tags=_lista_textos(datos, "tags", MAX_RESPONSABLES),
        checklist=_checklist(datos),
        enlaces=_lista_textos(datos, "enlaces", MAX_ENLACES),
        creado_por=_autor(),
    )
    if task is None:
        return jsonify(build_response(False, "Campaña o contenido no encontrado.")), 404

    logger.info("marketing crea task id=%s", task["id"])
    tarea_creada(task, departamento_actual(), _autor())
    return jsonify(build_response(True, "Tarea creada.", task=task)), 201


@marketing_api.route("/tasks/<int:task_id>", methods=["GET"])
@requiere_equipo
def api_obtener_task(task_id: int):
    task = obtener_task(task_id, departamento_actual())
    if task is None:
        return jsonify(build_response(False, "Tarea no encontrada.")), 404
    return jsonify({"ok": True, "task": task}), 200


@marketing_api.route("/tasks/<int:task_id>", methods=["PUT"])
@requiere_equipo
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
    if "hora" in datos:
        campos["hora"] = _texto(datos, "hora", maximo=5)
    if "responsables" in datos:
        campos["responsables"] = _lista_textos(datos, "responsables", MAX_RESPONSABLES)
    if "tags" in datos:
        campos["tags"] = _lista_textos(datos, "tags", MAX_RESPONSABLES)
    if "checklist" in datos:
        campos["checklist"] = _checklist(datos)
    if "enlaces" in datos:
        campos["enlaces"] = _lista_textos(datos, "enlaces", MAX_ENLACES)

    if not actualizar_task(task_id, departamento_actual(), **campos):
        return jsonify(build_response(False, "Tarea no encontrada o sin cambios.")), 404

    # Solo el cambio de estado se avisa: editar un título o una checklist es
    # ruido en el canal, mover una tarea a "Acabado" no.
    if "estado" in campos:
        tarea = obtener_task(task_id, departamento_actual())
        if tarea is not None:
            tarea_cambia_estado(
                tarea, campos["estado"], departamento_actual(), _autor()
            )
    return jsonify(build_response(True, "Tarea actualizada.")), 200


@marketing_api.route("/tasks/<int:task_id>", methods=["DELETE"])
@requiere_equipo
def api_eliminar_task(task_id: int):
    if not eliminar_task(task_id, departamento_actual()):
        return jsonify(build_response(False, "Tarea no encontrada.")), 404
    logger.info("marketing elimina task id=%s", task_id)
    return jsonify(build_response(True, "Tarea eliminada.")), 200


# --------------------------------------------------------------------------
# Comentarios de una tarea
# --------------------------------------------------------------------------

@marketing_api.route("/tasks/<int:task_id>/comments", methods=["GET"])
@requiere_equipo
def api_listar_task_comments(task_id: int):
    if obtener_task(task_id, departamento_actual()) is None:
        return jsonify(build_response(False, "Tarea no encontrada.")), 404
    return jsonify({"ok": True, "comments": listar_task_comments(task_id)}), 200


@marketing_api.route("/tasks/<int:task_id>/comments", methods=["POST"])
@requiere_equipo
def api_crear_task_comment(task_id: int):
    if obtener_task(task_id, departamento_actual()) is None:
        return jsonify(build_response(False, "Tarea no encontrada.")), 404

    datos = _payload()
    texto = _texto(
        datos, "texto", obligatorio=True, maximo=MAX_COMENTARIO_LEN, multilinea=True
    )
    comentario = crear_task_comment(task_id, _autor(), texto)
    logger.info("marketing crea comentario task_id=%s", task_id)
    return jsonify(build_response(True, "Comentario añadido.", comment=comentario)), 201


# --------------------------------------------------------------------------
# Calendario
# --------------------------------------------------------------------------

@marketing_api.route("/calendario", methods=["GET"])
@requiere_equipo
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
        "items": calendario(desde, hasta, departamento_actual()),
    }), 200


# --------------------------------------------------------------------------
# Miembros del departamento
# --------------------------------------------------------------------------

@marketing_api.route("/miembros", methods=["GET"])
@requiere_equipo
def api_miembros():
    """Directorio del departamento: quién está, qué sabe hacer y cuánto lleva
    encima. Las etiquetas salen de `equipo_accesos` (perfil de la persona); la
    carga se calcula sobre las tareas del departamento, no se guarda."""
    from backend.services.equipo import init_equipo_db, listar_equipo_accesos

    init_equipo_db()
    depto = departamento_actual()
    carga = carga_por_miembro(depto)
    miembros = [
        {
            "email": a["email"],
            "equipos": a["equipos"],
            "activo": a["activo"],
            "tags": a["tags"],
            "nombre": a["nombre"],
            "abiertas": carga.get(a["email"], 0),
        }
        for a in listar_equipo_accesos()
        if depto in a["equipos"] and a["activo"]
    ]
    return jsonify({"ok": True, "miembros": miembros}), 200


def _miembro_del_departamento(email: str) -> dict | None:
    """La persona, solo si está en el departamento de la petición: sin esto,
    la ficha sería una forma de leer las notas de cualquiera del club."""
    from backend.services.equipo import init_equipo_db, listar_equipo_accesos

    init_equipo_db()
    return next(
        (
            a
            for a in listar_equipo_accesos()
            if a["email"] == email and departamento_actual() in a["equipos"]
        ),
        None,
    )


@marketing_api.route("/miembros/ficha", methods=["GET"])
@requiere_equipo
def api_ficha_miembro():
    """El email va en query y no en la ruta: lleva `@` y puntos, y meterlo en el
    path obliga a escaparlo en los dos lados para no ganar nada."""
    email = request.args.get("email", "").strip().lower()
    acceso = _miembro_del_departamento(email)
    if acceso is None:
        return jsonify(build_response(False, "Miembro no encontrado.")), 404

    ficha = ficha_miembro(email, departamento_actual())
    ficha.update(
        email=acceso["email"],
        equipos=acceso["equipos"],
        vp_de=acceso["vp_de"],
        cargo=acceso["cargo"],
        tags=acceso["tags"],
        notas=acceso["notas"],
        nombre=acceso["nombre"],
        desde=acceso["created_at"],
    )
    return jsonify({"ok": True, "ficha": ficha}), 200


@marketing_api.route("/miembros/ficha", methods=["PUT"])
@requiere_equipo
def api_actualizar_ficha_miembro():
    """Solo etiquetas y nota: los permisos (equipos, vp, cargo) siguen siendo
    cosa de /admin."""
    from backend.services.equipo import actualizar_perfil

    datos = _payload()
    email = _texto(datos, "email", obligatorio=True).lower()
    if _miembro_del_departamento(email) is None:
        return jsonify(build_response(False, "Miembro no encontrado.")), 404

    tags = (
        _lista_textos(datos, "tags", MAX_RESPONSABLES) if "tags" in datos else None
    )
    notas = (
        _texto(datos, "notas", maximo=MAX_TEXTO_LARGO_LEN, multilinea=True)
        if "notas" in datos
        else None
    )
    if tags is None and notas is None:
        raise DatosInvalidos("No hay nada que actualizar.")

    actualizar_perfil(email, tags=tags, notas=notas)
    return jsonify(build_response(True, "Ficha actualizada.")), 200
