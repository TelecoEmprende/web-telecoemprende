import logging
import re
from datetime import date, timedelta

from flask import Blueprint, jsonify, request, session

from backend.api.admin import _validar_evento_calendario
from backend.api.marketing import (
    DatosInvalidos,
    _foto,
    _lista_textos,
    _payload,
    _texto,
    es_cargo_vp_o_admin,
)
from backend.config import (
    EQUIPOS_VALIDOS,
    MINUTOS_ENLACE_CLAVE,
    URL_PUBLICA,
    LOGIN_BLOCK_WINDOW_SECONDS,
    LUMA_CALENDAR_URL,
    MAX_DNI_LEN,
    MAX_EMAIL_LEN,
    MAX_LOGIN_ATTEMPTS_PER_WINDOW,
    MAX_NOMBRE_EQUIPO_LEN,
    MAX_RESPONSABLES,
    MAX_TEXTO_LARGO_LEN,
)
from backend.schemas import build_response
from backend.services.admin import is_admin_authenticated
from backend.services import auditoria
from backend.services.email import enviar_recuperacion_clave
from backend.services.luma import eventos_luma
from backend.services.equipo import (
    cambiar_password,
    canjear_token_recuperacion,
    crear_token_recuperacion,
    confirmar_evento_calendario,
    crear_evento_calendario,
    datos_formulario,
    equipo_session_info,
    guardar_datos_formulario,
    actualizar_perfil,
    is_equipo_authenticated,
    listar_directorio_club,
    listar_equipo_accesos,
    listar_eventos_calendario,
    listar_miembros_web,
    login_equipo,
    logout_equipo,
    marcar_asistio_evento,
    registrar_equipo_acceso,
)
from backend.services.marketing import (
    calendario_equipo,
    carga_club,
    ficha_miembro,
    metricas_club,
    mis_campanas,
    mis_tareas,
)
from backend.services.security import (
    demasiadas_peticiones,
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


@equipo_api.route("/login", methods=["POST"])
def api_equipo_login():
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


# La misma respuesta exista o no la cuenta: distinguirlas convertiría esta ruta
# en un enumerador de qué correos están dados de alta.
_ENLACE_ENVIADO = "Si hay una cuenta con ese correo, te hemos enviado un enlace para elegir otra contraseña."


@equipo_api.route("/olvide-clave", methods=["POST"])
def api_equipo_olvide_clave():
    """Pide el enlace para elegir contraseña nueva. Siempre responde lo mismo;
    lo que pasa de verdad (cuenta inexistente, enlace pedido hace nada, fallo de
    envío) solo queda en el registro."""
    ip = obtener_ip_real()
    if demasiadas_peticiones(
        ip,
        max_requests=MAX_LOGIN_ATTEMPTS_PER_WINDOW,
        window_seconds=LOGIN_BLOCK_WINDOW_SECONDS,
        bucket="equipo_olvide_clave",
    ):
        return jsonify(build_response(False, "Demasiados intentos. Espera unos minutos.")), 429

    payload = request.get_json(silent=True) or {}
    email = limpiar_texto(str(payload.get("email", ""))).lower()
    if not email or "@" not in email or len(email) > MAX_EMAIL_LEN:
        return jsonify(build_response(False, "Introduce un email válido.")), 400

    creado = crear_token_recuperacion(email)
    if creado is not None:
        token, nombre = creado
        enlace = f"{URL_PUBLICA}/equipo?recuperar={token}"
        if not enviar_recuperacion_clave(email, nombre, enlace, MINUTOS_ENLACE_CLAVE):
            # Aquí no se traga: quien pidió el enlace se queda sin entrada, y
            # un admin tiene que poder verlo (Auditoría) y ponerle una
            # contraseña provisional.
            auditoria.registrar(email, "EMAIL", "/api/equipo/olvide-clave (el correo no salió)", 502, ip)
    logger.info("equipo olvide-clave ip=%s enviado=%s", ip, creado is not None)
    return jsonify(build_response(True, _ENLACE_ENVIADO)), 200


@equipo_api.route("/restablecer-clave", methods=["POST"])
def api_equipo_restablecer_clave():
    """Elige contraseña nueva con el enlace del correo."""
    ip = obtener_ip_real()
    if demasiadas_peticiones(
        ip,
        max_requests=MAX_LOGIN_ATTEMPTS_PER_WINDOW,
        window_seconds=LOGIN_BLOCK_WINDOW_SECONDS,
        bucket="equipo_restablecer_clave",
    ):
        return jsonify(build_response(False, "Demasiados intentos. Espera unos minutos.")), 429

    payload = request.get_json(silent=True) or {}
    token = str(payload.get("token", ""))
    nueva = str(payload.get("nueva", ""))
    if len(nueva) < 8:
        return jsonify(build_response(False, "La contraseña debe tener al menos 8 caracteres.")), 400
    if not token or not canjear_token_recuperacion(token, nueva):
        return jsonify(build_response(
            False, "El enlace no vale: ha caducado o ya se usó. Pide otro desde «¿Olvidaste tu contraseña?»."
        )), 400
    logger.info("equipo restablece su contraseña ip=%s", ip)
    return jsonify(build_response(True, "Contraseña cambiada. Ya puedes entrar.")), 200


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
        else {
            "teams": [], "vp_de": [], "cargo": "", "email": "", "nombre": "", "admin": False,
            "cambiar_clave": False,
        }
    )
    return jsonify({"ok": True, "authenticated": authenticated, **info}), 200


@equipo_api.route("/directorio", methods=["GET"])
def api_equipo_directorio():
    """Quién es quién del club entero -- para el widget de "Mi semana".
    Cualquiera con sesión de equipo, no solo board/VP: es un directorio, no
    datos de rendimiento (eso es `/metricas`)."""
    if not is_equipo_authenticated() and not is_admin_authenticated():
        return jsonify(build_response(False, "No autorizado.")), 401
    return jsonify({"ok": True, "miembros": listar_directorio_club()}), 200


@equipo_api.route("/miembros-web", methods=["GET"])
def api_equipo_miembros_web():
    """Sección «Equipo» de la web pública: sin sesión, solo lo que ya se ve en
    la web (ver `listar_miembros_web`). La misma fila que /equipo, así que una
    foto cambiada en Cuentas cambia también aquí."""
    return jsonify({"ok": True, "miembros": listar_miembros_web()}), 200


@equipo_api.route("/calendario", methods=["GET"])
def api_equipo_calendario():
    if not is_equipo_authenticated():
        return jsonify(build_response(False, "No autorizado.")), 401

    return jsonify({"ok": True, "eventos": listar_eventos_calendario()}), 200


@equipo_api.route("/luma", methods=["GET"])
def api_equipo_luma():
    """Próximos eventos del calendario de Luma del club (ver services/luma.py)."""
    if not is_equipo_authenticated():
        return jsonify(build_response(False, "No autorizado.")), 401
    return jsonify({"ok": True, "calendario": LUMA_CALENDAR_URL, "eventos": eventos_luma()}), 200


@equipo_api.route("/accesos", methods=["GET"])
def api_equipo_accesos():
    """Enlaces del club para Herramientas: los servicios marcados como acceso
    para todo el club (ver `accesos_club`). Cualquiera con sesión de equipo."""
    if not is_equipo_authenticated():
        return jsonify(build_response(False, "No autorizado.")), 401
    from backend.services.registros import accesos_club

    return jsonify({"ok": True, "luma": LUMA_CALENDAR_URL, "accesos": accesos_club()}), 200


@equipo_api.route("/calendario", methods=["POST"])
def api_equipo_crear_calendario():
    """VPs pueden añadir eventos al calendario del club sin pasar por /admin
    -- editar y borrar siguen siendo cosa de /admin (ver CalendarioPanel)."""
    if not _puede_editar_calendario_club():
        return jsonify(build_response(False, "No autorizado.")), 401

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

    # `calendario_equipo()` también hace JOIN contra `reuniones` (ver el mismo
    # comentario en `requiere_equipo`, backend/api/marketing.py).

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

    email = session.get("equipo_email", "")
    return jsonify({"ok": True, "tareas": mis_tareas(email)}), 200


@equipo_api.route("/mis-proyectos", methods=["GET"])
def api_equipo_mis_proyectos():
    """Campañas (proyectos) de cualquier departamento donde la persona tiene
    una tarea, con su progreso -- mismo criterio cruzado que `/mis-tareas`."""
    if not is_equipo_authenticated():
        return jsonify(build_response(False, "No autorizado.")), 401

    email = session.get("equipo_email", "")
    return jsonify({"ok": True, "proyectos": mis_campanas(email)}), 200


@equipo_api.route("/metricas", methods=["GET"])
def api_equipo_metricas():
    """Salud del club entero para el board: mismo semáforo que la de cada
    departamento, cruzando los tres, más productividad por persona. Ver
    `metricas_club` -- gated a cargo/VP/admin."""
    if not is_equipo_authenticated() and not is_admin_authenticated():
        return jsonify(build_response(False, "No autorizado.")), 401
    if not es_cargo_vp_o_admin():
        return jsonify(build_response(False, "No autorizado.")), 403

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


@equipo_api.route("/perfil", methods=["GET"])
def api_equipo_perfil():
    """El perfil de la propia persona. Solo el suyo: el email sale de la
    sesión, nunca del payload. El DNI no sale de aquí hacia nadie más."""
    if not is_equipo_authenticated():
        return jsonify(build_response(False, "No autorizado.")), 401

    email = session.get("equipo_email", "")
    datos = datos_formulario(email)
    if datos is None:
        return jsonify(build_response(False, "Cuenta no encontrada.")), 404
    return jsonify({"ok": True, "email": email, **datos}), 200


@equipo_api.route("/perfil", methods=["PUT"])
def api_equipo_guardar_perfil():
    """Cada cual corrige lo suyo: nombre, apellidos, documento, LinkedIn y
    foto. Cargo, departamentos, permisos y «Sale en la web» son de admin."""
    if not is_equipo_authenticated():
        return jsonify(build_response(False, "No autorizado.")), 401

    payload = request.get_json(silent=True) or {}
    nombre = limpiar_texto(str(payload.get("nombre", "")))
    apellidos = limpiar_texto(str(payload.get("apellidos", "")))
    dni = re.sub(r"[\s-]", "", str(payload.get("dni", ""))).upper()
    # Sin limpiar_texto: escaparía los & de la URL. Acaba en un <a href> de la
    # web pública, así que solo https (nada de javascript:).
    linkedin = str(payload.get("linkedin", "")).strip()

    if not nombre or not apellidos:
        return jsonify(build_response(False, "Nombre y apellidos son obligatorios.")), 400
    if len(nombre) > MAX_NOMBRE_EQUIPO_LEN or len(apellidos) > MAX_NOMBRE_EQUIPO_LEN:
        return jsonify(build_response(False, "Nombre o apellidos demasiado largos.")), 400
    if dni and not _DOCUMENTO_RE.match(dni):
        return jsonify(build_response(False, "Introduce un DNI, NIE o pasaporte válido.")), 400
    if len(linkedin) > 600 or (linkedin and not linkedin.lower().startswith("https://")):
        return jsonify(build_response(False, "El LinkedIn tiene que ser un enlace https://.")), 400

    try:
        # Sin `foto` en el payload se conserva la que ya había.
        foto = _foto(payload) if "foto" in payload else None
    except DatosInvalidos as error:
        return jsonify(build_response(False, str(error))), 400

    email = session.get("equipo_email", "")
    if not guardar_datos_formulario(email, nombre, apellidos, dni, linkedin, foto):
        return jsonify(build_response(False, "Cuenta no encontrada.")), 404
    # Que el pie del sidebar enseñe ya el nombre nuevo, sin volver a entrar.
    session["equipo_nombre"] = nombre
    logger.info("equipo guarda su perfil")
    return jsonify(build_response(True, "Perfil guardado.")), 200


@equipo_api.route("/password", methods=["PUT"])
def api_equipo_cambiar_password():
    """Cambio de contraseña de la propia persona: pide la actual, así una
    sesión olvidada abierta no basta para quedarse con la cuenta."""
    if not is_equipo_authenticated():
        return jsonify(build_response(False, "No autorizado.")), 401

    payload = request.get_json(silent=True) or {}
    actual = str(payload.get("actual", ""))
    nueva = str(payload.get("nueva", ""))
    if len(nueva) < 8:
        return jsonify(build_response(False, "La contraseña debe tener al menos 8 caracteres.")), 400

    if not cambiar_password(session.get("equipo_email", ""), actual, nueva):
        return jsonify(build_response(False, "La contraseña actual no es correcta.")), 400
    session["equipo_cambiar_clave"] = False
    logger.info("equipo cambia su contraseña")
    return jsonify(build_response(True, "Contraseña cambiada.")), 200


# --------------------------------------------------------------------------
# Miembros del club
# --------------------------------------------------------------------------
# Todos somos de los tres departamentos, así que el directorio es uno solo y
# ya no cuelga de cada departamento. Lo que cambia de una persona a otra es el
# orden de preferencia (`equipos`) y su carga.


def _hay_sesion() -> bool:
    return is_equipo_authenticated() or is_admin_authenticated()


def _acceso_activo(email: str) -> dict | None:
    return next(
        (a for a in listar_equipo_accesos() if a["email"] == email and a["activo"]), None
    )


def _es_mi_ficha(email: str) -> bool:
    """La foto y el perfil los cambia cada cual el suyo. Admin también, para
    poder quitar una foto que no debería estar ahí."""
    return is_admin_authenticated() or session.get("equipo_email", "") == email


@equipo_api.route("/miembros", methods=["GET"])
def api_equipo_miembros():
    """Directorio del club: quién está, en qué orden prefiere cada
    departamento, qué sabe hacer y cuánto lleva encima (en total y por
    departamento). Sin DNI ni nada personal: solo lo de trabajo."""
    if not _hay_sesion():
        return jsonify(build_response(False, "No autorizado.")), 401

    carga = carga_club()
    miembros = [
        {
            "email": a["email"],
            "nombre": a["nombre"],
            "apellidos": a["apellidos"],
            "foto": a["foto"],
            "equipos": a["equipos"],
            "cargo": a["cargo"],
            "vp_de": a["vp_de"],
            "tags": a["tags"],
            "abiertas": carga.get(a["email"], {}).get("total", 0),
            "abiertas_por_depto": {
                d: carga.get(a["email"], {}).get(d, 0) for d in EQUIPOS_VALIDOS
            },
        }
        for a in listar_equipo_accesos()
        if a["activo"]
    ]
    return jsonify({"ok": True, "miembros": miembros}), 200


@equipo_api.route("/miembros/ficha", methods=["GET"])
def api_equipo_ficha_miembro():
    """El email va en query y no en la ruta: lleva `@` y puntos, y meterlo en el
    path obliga a escaparlo en los dos lados para no ganar nada."""
    if not _hay_sesion():
        return jsonify(build_response(False, "No autorizado.")), 401

    email = request.args.get("email", "").strip().lower()
    acceso = _acceso_activo(email)
    if acceso is None:
        return jsonify(build_response(False, "Miembro no encontrado.")), 404

    ficha = ficha_miembro(email)
    ficha.update(
        email=acceso["email"],
        equipos=acceso["equipos"],
        vp_de=acceso["vp_de"],
        cargo=acceso["cargo"],
        tags=acceso["tags"],
        notas=acceso["notas"],
        nombre=acceso["nombre"],
        apellidos=acceso["apellidos"],
        desde=acceso["created_at"],
        foto=acceso["foto"],
        # Quién puede editar esta ficha lo decide el servidor, no el frontend
        # (que solo lo usa para enseñar u ocultar el botón).
        es_tu_ficha=_es_mi_ficha(email),
        # Tus datos personales (nombre, documento, contraseña) solo los cambias
        # tú, también los admins: aquí no vale `_es_mi_ficha`.
        es_yo=session.get("equipo_email", "") == email,
    )
    return jsonify({"ok": True, "ficha": ficha}), 200


@equipo_api.route("/miembros/ficha", methods=["PUT"])
def api_equipo_actualizar_ficha_miembro():
    """Habilidades y nota de equipo (las edita cualquiera, para repartir mejor)
    y la foto (solo la tuya). Departamentos, cargo y permisos siguen siendo
    cosa de Cuentas."""
    if not _hay_sesion():
        return jsonify(build_response(False, "No autorizado.")), 401

    try:
        datos = _payload()
        email = _texto(datos, "email", obligatorio=True).lower()
        if _acceso_activo(email) is None:
            return jsonify(build_response(False, "Miembro no encontrado.")), 404

        tags = _lista_textos(datos, "tags", MAX_RESPONSABLES) if "tags" in datos else None
        notas = (
            _texto(datos, "notas", maximo=MAX_TEXTO_LARGO_LEN, multilinea=True)
            if "notas" in datos
            else None
        )
        foto = None
        if "foto" in datos:
            if not _es_mi_ficha(email):
                return jsonify(build_response(False, "Solo puedes cambiar tu propia foto.")), 403
            foto = _foto(datos)

        if tags is None and notas is None and foto is None:
            raise DatosInvalidos("No hay nada que actualizar.")
    except DatosInvalidos as error:
        return jsonify(build_response(False, str(error))), 400

    actualizar_perfil(email, tags=tags, notas=notas, foto=foto)
    return jsonify(build_response(True, "Ficha actualizada.")), 200
