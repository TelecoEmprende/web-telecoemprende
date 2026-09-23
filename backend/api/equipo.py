import logging
import re
from datetime import date, timedelta

from flask import Blueprint, jsonify, request, session

from backend.api.admin import _validar_evento_calendario
from backend.api.marketing import DatosInvalidos, _foto
from backend.config import (
    CARGOS_VALIDOS,
    EQUIPOS_VALIDOS,
    LOGIN_BLOCK_WINDOW_SECONDS,
    MAX_DNI_LEN,
    MAX_EMAIL_LEN,
    MAX_LOGIN_ATTEMPTS_PER_WINDOW,
    MAX_NOMBRE_EQUIPO_LEN,
)
from backend.schemas import build_response
from backend.services.admin import is_admin_authenticated
from backend.services.equipo import (
    confirmar_evento_calendario,
    crear_evento_calendario,
    datos_formulario,
    equipo_session_info,
    guardar_datos_formulario,
    init_equipo_db,
    is_equipo_authenticated,
    listar_directorio_club,
    listar_eventos_calendario,
    login_equipo,
    logout_equipo,
    marcar_asistio_evento,
    registrar_equipo_acceso,
)
from backend.services.marketing import (
    calendario_equipo,
    init_marketing_db,
    metricas_club,
    mis_campanas,
    mis_tareas,
)
from backend.services.security import (
    demasiadas_peticiones,
    email_valido,
    limpiar_texto,
    obtener_ip_real,
)

logger = logging.getLogger("telecoemprende.equipo")


equipo_api = Blueprint("equipo_api", __name__, url_prefix="/api/equipo")


def _puede_editar_calendario_club() -> bool:
    """VP de cualquier departamento, o admin. El calendario del club es
    compartido y no de un solo departamento, así que aquí no hay
    `departamento_actual()` que comprobar -- basta con ser VP de alguno."""
    return is_admin_authenticated() or (
        is_equipo_authenticated() and len(equipo_session_info()["vp_de"]) > 0
    )


def _es_board_o_vp() -> bool:
    """Board del club (cargo de dirección) o VP de cualquier departamento, o
    admin. Igual que `_puede_editar_calendario_club` pero sumando el cargo:
    las métricas las ve quien decide sobre el club entero, no solo quien
    edita el calendario."""
    if is_admin_authenticated():
        return True
    if not is_equipo_authenticated():
        return False
    sesion = equipo_session_info()
    return sesion["cargo"] in CARGOS_VALIDOS or len(sesion["vp_de"]) > 0


@equipo_api.route("/login", methods=["POST"])
def api_equipo_login():
    init_equipo_db()

    ip = obtener_ip_real()
    if demasiadas_peticiones(
        ip,
        max_requests=MAX_LOGIN_ATTEMPTS_PER_WINDOW,
        window_seconds=LOGIN_BLOCK_WINDOW_SECONDS,
        bucket="equipo_login",
    ):
        logger.warning("equipo login rate-limited ip=%s", ip)
        return (
            jsonify(build_response(False, "Demasiados intentos. Espera unos minutos.")),
            429,
        )

    payload = request.get_json(silent=True) or {}
    email = limpiar_texto(str(payload.get("email", ""))).lower()
    password = str(payload.get("password", ""))

    info = login_equipo(email, password)
    if info is not None:
        logger.info("equipo login success ip=%s", ip)
        return jsonify(build_response(True, "Sesión iniciada.", **info)), 200

    # Mensaje genérico: no revela si el email existe o no.
    logger.warning("equipo login failed ip=%s", ip)
    return jsonify(build_response(False, "Credenciales incorrectas.")), 401


@equipo_api.route("/registro", methods=["POST"])
def api_equipo_registro():
    """Alta propia: crea la cuenta desactivada y sin equipos, admin le asigna
    el rol y la activa desde /admin.

    ponytail: temporal, mientras entra el equipo. Para quitarla, borrar esta
    ruta, `registrar_equipo_acceso` y el modo "crear cuenta" del login.
    """
    init_equipo_db()

    ip = obtener_ip_real()
    if demasiadas_peticiones(
        ip,
        max_requests=MAX_LOGIN_ATTEMPTS_PER_WINDOW,
        window_seconds=LOGIN_BLOCK_WINDOW_SECONDS,
        bucket="equipo_registro",
    ):
        logger.warning("equipo registro rate-limited ip=%s", ip)
        return (
            jsonify(build_response(False, "Demasiados intentos. Espera unos minutos.")),
            429,
        )

    payload = request.get_json(silent=True) or {}
    email = limpiar_texto(str(payload.get("email", ""))).lower()
    password = str(payload.get("password", ""))

    # Mismo criterio que el alta desde /admin: no se exige correo UPM, solo que
    # tenga forma de email (puede haber gente externa colaborando).
    if not email or "@" not in email or len(email) > MAX_EMAIL_LEN:
        return jsonify(build_response(False, "Introduce un email válido.")), 400

    if len(password) < 8:
        return jsonify(build_response(False, "La contraseña debe tener al menos 8 caracteres.")), 400

    creado = registrar_equipo_acceso(email, password)
    logger.info("equipo registro ip=%s creado=%s", ip, creado)

    # La misma respuesta exista o no la cuenta: distinguirlas convertiría esta
    # ruta en un enumerador de qué correos están dados de alta.
    return (
        jsonify(build_response(
            True, "Cuenta creada. Un admin tiene que darte acceso antes de que puedas entrar."
        )),
        201,
    )


@equipo_api.route("/logout", methods=["POST"])
def api_equipo_logout():
    logout_equipo()
    return jsonify(build_response(True, "Sesión cerrada correctamente.")), 200


@equipo_api.route("/session", methods=["GET"])
def api_equipo_session():
    authenticated = is_equipo_authenticated()
    info = (
        equipo_session_info()
        if authenticated
        else {"teams": [], "vp_de": [], "cargo": "", "email": "", "nombre": ""}
    )
    return jsonify({"ok": True, "authenticated": authenticated, **info}), 200


@equipo_api.route("/directorio", methods=["GET"])
def api_equipo_directorio():
    """Quién es quién del club entero -- para el widget de "Mi semana".
    Cualquiera con sesión de equipo, no solo board/VP: es un directorio, no
    datos de rendimiento (eso es `/metricas` y `/miembros/salud`)."""
    if not is_equipo_authenticated() and not is_admin_authenticated():
        return jsonify(build_response(False, "No autorizado.")), 401
    return jsonify({"ok": True, "miembros": listar_directorio_club()}), 200


@equipo_api.route("/calendario", methods=["GET"])
def api_equipo_calendario():
    if not is_equipo_authenticated():
        return jsonify(build_response(False, "No autorizado.")), 401

    init_equipo_db()
    return jsonify({"ok": True, "eventos": listar_eventos_calendario()}), 200


@equipo_api.route("/calendario", methods=["POST"])
def api_equipo_crear_calendario():
    """VPs pueden añadir eventos al calendario del club sin pasar por /admin
    -- editar y borrar siguen siendo cosa de /admin (ver CalendarioPanel)."""
    if not _puede_editar_calendario_club():
        return jsonify(build_response(False, "No autorizado.")), 401

    init_equipo_db()
    payload = request.get_json(silent=True) or {}
    error = _validar_evento_calendario(payload)
    if error:
        return jsonify(build_response(False, error)), 400

    evento = crear_evento_calendario(
        limpiar_texto(str(payload.get("titulo", ""))),
        limpiar_texto(str(payload.get("descripcion", ""))),
        str(payload.get("fecha", "")).strip(),
        str(payload.get("hora", "")).strip(),
    )
    logger.info("equipo crea evento calendario id=%s", evento["id"])
    return jsonify(build_response(True, "Evento creado.", evento=evento)), 201


@equipo_api.route("/calendario/<int:evento_id>/confirmar", methods=["POST"])
def api_equipo_confirmar_evento(evento_id: int):
    """"Voy" / "no voy" de la propia persona -- cualquiera con sesión de
    equipo, sobre sí mismo (no hay `email` en el payload a propósito)."""
    if not is_equipo_authenticated():
        return jsonify(build_response(False, "No autorizado.")), 401

    init_equipo_db()
    payload = request.get_json(silent=True) or {}
    confirmar = bool(payload.get("confirmar", True))
    email = session.get("equipo_email", "")

    if not confirmar_evento_calendario(evento_id, email, confirmar):
        return jsonify(build_response(False, "Evento no encontrado.")), 404
    return jsonify(build_response(True, "Confirmación actualizada.")), 200


@equipo_api.route("/calendario/<int:evento_id>/checkin", methods=["POST"])
def api_equipo_checkin_evento(evento_id: int):
    """Check-in el día del evento: lo marca quien gestiona la puerta (VP de
    cualquier departamento, o admin), no la propia persona -- mismo criterio
    que añadir un evento (`_puede_editar_calendario_club`)."""
    if not _puede_editar_calendario_club():
        return jsonify(build_response(False, "No autorizado.")), 401

    init_equipo_db()
    payload = request.get_json(silent=True) or {}
    email = limpiar_texto(str(payload.get("email", ""))).lower()
    asistio = bool(payload.get("asistio", True))

    if not email or "@" not in email:
        return jsonify(build_response(False, "Introduce un email válido.")), 400

    if not marcar_asistio_evento(evento_id, email, asistio):
        return jsonify(build_response(False, "Evento no encontrado.")), 404
    return jsonify(build_response(True, "Asistencia actualizada.")), 200


@equipo_api.route("/calendario-equipo", methods=["GET"])
def api_equipo_calendario_cruzado():
    """Lectura cruzada: deadlines/publicaciones/reuniones de los
    departamentos pedidos (todos por defecto), para el calendario de
    departamento con el filtro "todos los departamentos" (ver
    `CalendarPanel.tsx`). Cualquier sesión de /equipo puede leerlo -- no hace
    falta pertenecer al departamento cuyos datos se están mirando, es lectura,
    no edición."""
    if not is_equipo_authenticated() and not is_admin_authenticated():
        return jsonify(build_response(False, "No autorizado.")), 401

    init_marketing_db()
    # `calendario_equipo()` también hace JOIN contra `reuniones` (ver el mismo
    # comentario en `requiere_equipo`, backend/api/marketing.py).
    from backend.services.registros import init_registros_db

    init_registros_db()
    args = request.args.to_dict()
    hoy = date.today()

    def _fecha(clave, por_defecto):
        valor = args.get(clave)
        if not valor:
            return por_defecto
        try:
            return date.fromisoformat(valor)
        except ValueError:
            return por_defecto

    desde = _fecha("desde", hoy.replace(day=1))
    siguiente_mes = desde.replace(day=28) + timedelta(days=4)
    hasta = _fecha("hasta", siguiente_mes - timedelta(days=siguiente_mes.day))

    crudo = args.get("departamentos", "")
    departamentos = [d for d in crudo.split(",") if d in EQUIPOS_VALIDOS] or list(EQUIPOS_VALIDOS)

    return jsonify({
        "ok": True,
        "desde": desde.isoformat(),
        "hasta": hasta.isoformat(),
        "items": calendario_equipo(desde, hasta, departamentos),
    }), 200


@equipo_api.route("/mis-tareas", methods=["GET"])
def api_equipo_mis_tareas():
    """Tareas abiertas de la persona logueada, de cualquier departamento --
    para el resumen personal de "Inicio". Vive aquí y no en marketing.py
    porque no está atada a un solo departamento (ver `mis_tareas`)."""
    if not is_equipo_authenticated():
        return jsonify(build_response(False, "No autorizado.")), 401

    init_marketing_db()
    email = session.get("equipo_email", "")
    return jsonify({"ok": True, "tareas": mis_tareas(email)}), 200


@equipo_api.route("/mis-proyectos", methods=["GET"])
def api_equipo_mis_proyectos():
    """Campañas (proyectos) de cualquier departamento donde la persona tiene
    una tarea, con su progreso -- mismo criterio cruzado que `/mis-tareas`."""
    if not is_equipo_authenticated():
        return jsonify(build_response(False, "No autorizado.")), 401

    init_marketing_db()
    email = session.get("equipo_email", "")
    return jsonify({"ok": True, "proyectos": mis_campanas(email)}), 200


@equipo_api.route("/metricas", methods=["GET"])
def api_equipo_metricas():
    """Salud del club entero para el board: mismo semáforo que la de cada
    departamento, cruzando los tres, más productividad por persona. Ver
    `metricas_club` -- gated a board/VP, igual que `/api/marketing/miembros/
    salud` en cada departamento por separado."""
    if not is_equipo_authenticated() and not is_admin_authenticated():
        return jsonify(build_response(False, "No autorizado.")), 401
    if not _es_board_o_vp():
        return jsonify(build_response(False, "No autorizado.")), 403

    init_marketing_db()
    init_equipo_db()
    try:
        dias = int(request.args.get("dias", "30"))
    except ValueError:
        dias = 30
    dias = max(7, min(dias, 180))

    return jsonify({"ok": True, "metricas": metricas_club(dias)}), 200


# DNI, NIE o pasaporte: letras y números, sin espacios ni guiones (se quitan
# antes de validar). No se comprueba la letra de control -- un pasaporte
# extranjero no la tiene.
_DOCUMENTO_RE = re.compile(rf"^[A-Z0-9]{{5,{MAX_DNI_LEN}}}$")


@equipo_api.route("/datos-formulario", methods=["GET"])
def api_equipo_datos_formulario():
    """Ficha de datos personales de la propia persona (`/equipo/datosformulario`).
    Solo la suya: el email sale de la sesión, nunca del payload."""
    if not is_equipo_authenticated():
        return jsonify(build_response(False, "No autorizado.")), 401

    init_equipo_db()
    email = session.get("equipo_email", "")
    datos = datos_formulario(email)
    if datos is None:
        return jsonify(build_response(False, "Cuenta no encontrada.")), 404
    return jsonify({"ok": True, "email": email, **datos}), 200


@equipo_api.route("/datos-formulario", methods=["PUT"])
def api_equipo_guardar_datos_formulario():
    if not is_equipo_authenticated():
        return jsonify(build_response(False, "No autorizado.")), 401

    init_equipo_db()
    payload = request.get_json(silent=True) or {}
    nombre = limpiar_texto(str(payload.get("nombre", "")))
    apellidos = limpiar_texto(str(payload.get("apellidos", "")))
    dni = re.sub(r"[\s-]", "", str(payload.get("dni", ""))).upper()
    correo = limpiar_texto(str(payload.get("correo", ""))).lower()

    if not nombre or not apellidos:
        return jsonify(build_response(False, "Nombre y apellidos son obligatorios.")), 400
    if len(nombre) > MAX_NOMBRE_EQUIPO_LEN or len(apellidos) > MAX_NOMBRE_EQUIPO_LEN:
        return jsonify(build_response(False, "Nombre o apellidos demasiado largos.")), 400
    if not _DOCUMENTO_RE.match(dni):
        return jsonify(build_response(False, "Introduce un DNI, NIE o pasaporte válido.")), 400
    if not email_valido(correo) or len(correo) > MAX_EMAIL_LEN:
        return jsonify(build_response(False, "Introduce un correo válido.")), 400

    try:
        # Sin `foto` en el payload se conserva la que ya había.
        foto = _foto(payload) if "foto" in payload else None
    except DatosInvalidos as error:
        return jsonify(build_response(False, str(error))), 400

    email = session.get("equipo_email", "")
    if not guardar_datos_formulario(email, nombre, apellidos, dni, correo, foto):
        return jsonify(build_response(False, "Cuenta no encontrada.")), 404
    # Que el pie del sidebar enseñe ya el nombre nuevo, sin volver a entrar.
    session["equipo_nombre"] = nombre
    logger.info("equipo guarda datos formulario")
    return jsonify(build_response(True, "Datos guardados. ¡Gracias!")), 200
