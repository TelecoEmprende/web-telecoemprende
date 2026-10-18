import logging
import re

from flask import Blueprint, jsonify, request, send_file, session

from backend.api.marketing import _foto
from backend.api.sesion import requiere_admin

from backend.config import (
    CARGOS_VALIDOS,
    DEPARTAMENTOS_VALIDOS,
    ESTADOS_VALIDOS,
    EQUIPOS_VALIDOS,
    MAX_DNI_LEN,
    MAX_EMAIL_LEN,
    MAX_NOMBRE_EQUIPO_LEN,
    MIN_EQUIPOS_POR_PERSONA,
)
from backend.schemas import build_response
from backend.services.admin import is_admin_authenticated, logout_admin
from backend.services import auditoria
from backend.services.email import enviar_email_estado
from backend.services.equipo import (
    actualizar_equipo_acceso,
    actualizar_evento_calendario,
    crear_equipo_acceso,
    crear_evento_calendario,
    eliminar_equipo_acceso,
    eliminar_evento_calendario,
    generar_excel_equipo_en_memoria,
    generar_pdf_equipo_en_memoria,
    listar_equipo_accesos,
    listar_eventos_calendario,
    poner_clave_provisional,
)
from backend.services.registrations import (
    actualizar_estado,
    actualizar_registro,
    eliminar_registro,
    generar_excel_en_memoria,
    marcar_notificado,
    obtener_eventos,
    obtener_pendientes_notificacion,
    obtener_registros,
)
from backend.services.security import (
    drive_link_valido,
    email_upm_valido,
    limpiar_texto,
    longitud_valida,
    telefono_valido,
)

logger = logging.getLogger("telecoemprende.admin")


admin_api = Blueprint("admin_api", __name__, url_prefix="/api/admin")


@admin_api.route("/logout", methods=["POST"])
def api_admin_logout():
    logout_admin()
    return jsonify(build_response(True, "Sesión cerrada correctamente.")), 200


@admin_api.route("/session", methods=["GET"])
def api_admin_session():
    return jsonify({
        "ok": True,
        "authenticated": is_admin_authenticated(),
    }), 200


@admin_api.route("/registrations", methods=["GET"])
@requiere_admin
def api_admin_registrations():
    evento = request.args.get("evento") or None
    registros = obtener_registros(evento)
    eventos = obtener_eventos()
    return jsonify({
        "ok": True,
        "total": len(registros),
        "registros": registros,
        "eventos": eventos,
    }), 200


@admin_api.route("/download", methods=["GET"])
@requiere_admin
def api_admin_download():
    evento = request.args.get("evento") or None
    filename = f"registros_{evento}.xlsx" if evento else "registros_todos.xlsx"
    return send_file(
        generar_excel_en_memoria(evento),
        as_attachment=True,
        download_name=filename,
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )


@admin_api.route("/registrations/<int:reg_id>", methods=["PUT"])
@requiere_admin
def api_admin_update_registration(reg_id: int):
    payload = request.get_json(silent=True) or {}
    nombre = limpiar_texto(str(payload.get("nombre", "")))
    apellidos = limpiar_texto(str(payload.get("apellidos", "")))
    escuela = limpiar_texto(str(payload.get("escuela", "")))
    nivel = limpiar_texto(str(payload.get("nivel", "")))
    estudios = limpiar_texto(str(payload.get("estudios", "")))
    email = limpiar_texto(str(payload.get("email", ""))).lower()
    telefono = limpiar_texto(str(payload.get("telefono", "")))
    departamento = limpiar_texto(str(payload.get("departamento", "")))
    drive_link = limpiar_texto(str(payload.get("drive_link", "")))

    if not all([nombre, apellidos, estudios, email, telefono, departamento, drive_link]):
        return jsonify(build_response(False, "Todos los campos son obligatorios.")), 400

    if departamento not in DEPARTAMENTOS_VALIDOS:
        return jsonify(build_response(False, "Departamento no válido.")), 400

    if not longitud_valida(nombre, apellidos, estudios, email, drive_link, escuela, nivel, telefono):
        return (
            jsonify(build_response(
                False,
                "Alguno de los campos supera la longitud permitida.",
            )),
            400,
        )

    if not email_upm_valido(email):
        return (
            jsonify(build_response(
                False,
                "Usa un correo institucional de la UPM (@alumnos.upm.es o @upm.es).",
            )),
            400,
        )

    if not telefono_valido(telefono):
        return (
            jsonify(build_response(
                False,
                "Introduce un número de teléfono válido.",
            )),
            400,
        )

    if not drive_link_valido(drive_link):
        return (
            jsonify(build_response(
                False,
                "Introduce un enlace de Google Drive válido (https://drive.google.com/...).",
            )),
            400,
        )

    if actualizar_registro(
        reg_id, nombre, apellidos, estudios, email, departamento, drive_link, escuela, nivel, telefono
    ):
        logger.info("admin update registration id=%s", reg_id)
        return jsonify(build_response(True, "Registro actualizado.")), 200

    return jsonify(build_response(False, "El email ya está registrado en otra inscripción.")), 409


@admin_api.route("/registrations/<int:reg_id>/estado", methods=["PATCH"])
@requiere_admin
def api_admin_update_estado(reg_id: int):
    payload = request.get_json(silent=True) or {}
    estado = str(payload.get("estado", ""))

    if estado not in ESTADOS_VALIDOS:
        return jsonify(build_response(False, "Estado no válido.")), 400

    registro = actualizar_estado(reg_id, estado)
    if registro is None:
        return jsonify(build_response(False, "Registro no encontrado.")), 404

    logger.info("admin update estado id=%s estado=%s", reg_id, estado)
    return jsonify(build_response(True, "Estado actualizado.")), 200


@admin_api.route("/registrations/notificar", methods=["POST"])
@requiere_admin
def api_admin_notificar():
    """Envía (ahora, no antes) el email de estado a todos los registros del estado
    dado que aún no han sido notificados. Clasificar (PATCH .../estado) nunca envía
    solo por sí mismo: hace falta pulsar "Enviar notificaciones" en el panel."""
    payload = request.get_json(silent=True) or {}
    estado = str(payload.get("estado", ""))

    if estado not in ("aceptado", "rechazado", "waitlist"):
        return jsonify(build_response(False, "Estado no válido para notificar.")), 400

    pendientes = obtener_pendientes_notificacion(estado)
    enviados = 0
    for registro in pendientes:
        if enviar_email_estado(registro, estado):
            marcar_notificado(registro["id"])
            enviados += 1

    logger.info("admin notificar estado=%s total=%s enviados=%s", estado, len(pendientes), enviados)
    return jsonify(build_response(
        True,
        f"{enviados} de {len(pendientes)} emails enviados.",
        total=len(pendientes),
        enviados=enviados,
    )), 200


@admin_api.route("/registrations/<int:reg_id>", methods=["DELETE"])
@requiere_admin
def api_admin_delete_registration(reg_id: int):
    if eliminar_registro(reg_id):
        logger.info("admin delete registration id=%s", reg_id)
        return jsonify(build_response(True, "Registro eliminado.")), 200

    return jsonify(build_response(False, "Registro no encontrado.")), 404


@admin_api.route("/equipo", methods=["GET"])
@requiere_admin
def api_admin_listar_equipo():
    return jsonify({"ok": True, "accesos": listar_equipo_accesos()}), 200


def _error_equipos(equipos: list) -> str | None:
    """Todos somos de los tres departamentos: cada persona los ordena del 1º al
    3º, sin repetir (el orden se guarda tal cual)."""
    if len(set(equipos)) != len(equipos):
        return "No repitas departamento entre preferencias."
    if len(equipos) < MIN_EQUIPOS_POR_PERSONA:
        return "Ordena los tres departamentos: 1ª, 2ª y 3ª preferencia."
    return None


@admin_api.route("/equipo", methods=["POST"])
@requiere_admin
def api_admin_crear_equipo():
    payload = request.get_json(silent=True) or {}
    email = limpiar_texto(str(payload.get("email", ""))).lower()
    password = str(payload.get("password", ""))
    equipos = payload.get("equipos")
    vp_de = payload.get("vp_de") or []
    cargo = str(payload.get("cargo", "") or "")
    nombre = limpiar_texto(str(payload.get("nombre", "") or ""))
    apellidos = limpiar_texto(str(payload.get("apellidos", "") or ""))
    es_admin = payload.get("es_admin", False)

    # No exigimos que sea correo UPM (puede ser gente externa colaborando en un
    # equipo): solo que tenga forma de email.
    if not email or "@" not in email:
        return jsonify(build_response(False, "Introduce un email válido.")), 400

    if len(email) > MAX_EMAIL_LEN:
        return jsonify(build_response(False, "El email supera la longitud permitida.")), 400

    if len(password) < 8:
        return jsonify(build_response(False, "La contraseña debe tener al menos 8 caracteres.")), 400

    if not isinstance(equipos, list) or any(e not in EQUIPOS_VALIDOS for e in equipos):
        return jsonify(build_response(False, "Selecciona departamentos válidos.")), 400

    error = _error_equipos(equipos)
    if error:
        return jsonify(build_response(False, error)), 400

    if not isinstance(es_admin, bool):
        return jsonify(build_response(False, "Valor de 'es_admin' no válido.")), 400

    if not isinstance(vp_de, list) or any(v not in equipos for v in vp_de):
        return jsonify(build_response(False, "VP solo puede marcarse en un equipo ya seleccionado.")), 400

    if cargo and cargo not in CARGOS_VALIDOS:
        return jsonify(build_response(False, "Cargo no válido.")), 400

    if len(nombre) > MAX_NOMBRE_EQUIPO_LEN or len(apellidos) > MAX_NOMBRE_EQUIPO_LEN:
        return jsonify(build_response(False, "El nombre supera la longitud permitida.")), 400

    acceso = crear_equipo_acceso(
        email, password, equipos, vp_de=vp_de, cargo=cargo, nombre=nombre,
        es_admin=es_admin, apellidos=apellidos,
    )
    if acceso is None:
        return jsonify(build_response(False, "Ese email ya tiene acceso de equipo.")), 409

    logger.info("admin crea acceso equipo email=%s equipos=%s", email, equipos)
    return jsonify(build_response(True, "Acceso creado.", acceso=acceso)), 201


@admin_api.route("/equipo/<int:acceso_id>/clave-provisional", methods=["POST"])
@requiere_admin
def api_admin_clave_provisional(acceso_id: int):
    """Para quien no puede recuperar la contraseña por correo: una provisional
    que se enseña una sola vez y que la persona cambia al entrar."""
    provisional = poner_clave_provisional(acceso_id)
    if provisional is None:
        return jsonify(build_response(False, "Acceso no encontrado.")), 404
    logger.info("admin pone clave provisional a id=%s", acceso_id)
    return jsonify(build_response(True, "Contraseña provisional creada.", password=provisional)), 200


@admin_api.route("/equipo/<int:acceso_id>", methods=["PUT"])
@requiere_admin
def api_admin_actualizar_equipo(acceso_id: int):
    payload = request.get_json(silent=True) or {}
    equipos = payload.get("equipos")
    vp_de = payload.get("vp_de")
    cargo = payload.get("cargo")
    activo = payload.get("activo")
    password = str(payload.get("password", "")) or None
    nombre = payload.get("nombre")
    apellidos = payload.get("apellidos")
    dni = payload.get("dni")
    nuevo_email = payload.get("email")
    registro_id = payload.get("registro_id")
    es_admin = payload.get("es_admin")
    en_web = payload.get("en_web")
    if en_web is not None and not isinstance(en_web, bool):
        return jsonify(build_response(False, "Valor de 'en_web' no válido.")), 400
    linkedin = payload.get("linkedin")
    if linkedin is not None:
        # Sin limpiar_texto: escaparía los & de la URL. Acaba en un <a href>
        # de la web pública, así que solo https (nada de javascript:).
        linkedin = str(linkedin).strip()
        if len(linkedin) > 600 or (linkedin and not linkedin.lower().startswith("https://")):
            return jsonify(build_response(False, "El LinkedIn tiene que ser un enlace https://.")), 400
    foto = _foto(payload) if "foto" in payload else None

    # La combinación equipos/vp_de/cargo la valida el servicio contra la fila ya
    # guardada (aquí solo se ven los campos que llegan en la petición).
    if equipos is not None and (
        not isinstance(equipos, list) or any(e not in EQUIPOS_VALIDOS for e in equipos)
    ):
        return jsonify(build_response(False, "Selecciona al menos un equipo válido.")), 400

    if equipos:
        error = _error_equipos(equipos)
        if error:
            return jsonify(build_response(False, error)), 400

    if es_admin is not None and not isinstance(es_admin, bool):
        return jsonify(build_response(False, "Valor de 'es_admin' no válido.")), 400

    # Quitarse el admin a uno mismo puede dejar el club sin nadie que lo
    # devuelva: que lo haga otra persona con admin.
    if es_admin is False and any(
        a["id"] == acceso_id and a["email"] == session.get("equipo_email")
        for a in listar_equipo_accesos()
    ):
        return jsonify(build_response(False, "No puedes quitarte el admin a ti mismo.")), 400

    if vp_de is not None and not isinstance(vp_de, list):
        return jsonify(build_response(False, "Valor de 'vp_de' no válido.")), 400

    if cargo is not None and cargo and cargo not in CARGOS_VALIDOS:
        return jsonify(build_response(False, "Cargo no válido.")), 400

    if activo is not None and not isinstance(activo, bool):
        return jsonify(build_response(False, "Valor de 'activo' no válido.")), 400

    if password is not None and len(password) < 8:
        return jsonify(build_response(False, "La contraseña debe tener al menos 8 caracteres.")), 400

    if nombre is not None:
        nombre = limpiar_texto(str(nombre))
        if len(nombre) > MAX_NOMBRE_EQUIPO_LEN:
            return jsonify(build_response(False, "El nombre supera la longitud permitida.")), 400

    if apellidos is not None:
        apellidos = limpiar_texto(str(apellidos))
        if len(apellidos) > MAX_NOMBRE_EQUIPO_LEN:
            return jsonify(build_response(False, "Los apellidos superan la longitud permitida.")), 400

    if dni is not None:
        dni = limpiar_texto(str(dni))
        if len(dni) > MAX_DNI_LEN:
            return jsonify(build_response(False, "El DNI supera la longitud permitida.")), 400

    if nuevo_email is not None:
        nuevo_email = limpiar_texto(str(nuevo_email)).lower()
        if "@" not in nuevo_email or len(nuevo_email) > MAX_EMAIL_LEN:
            return jsonify(build_response(False, "Introduce un email válido.")), 400
        # El email es el login de la sesión abierta: cambiarse el propio aquí
        # la dejaría apuntando a una cuenta que ya no existe con ese nombre.
        if any(
            a["id"] == acceso_id and a["email"] == session.get("equipo_email")
            for a in listar_equipo_accesos()
        ):
            return jsonify(build_response(False, "No puedes cambiar tu propio email.")), 400
        if any(a["email"] == nuevo_email and a["id"] != acceso_id for a in listar_equipo_accesos()):
            return jsonify(build_response(False, "Ese email ya tiene acceso de equipo.")), 409

    if registro_id is not None and (isinstance(registro_id, bool) or not isinstance(registro_id, int)):
        return jsonify(build_response(False, "Valor de 'registro_id' no válido.")), 400

    if actualizar_equipo_acceso(
        acceso_id,
        equipos=equipos,
        vp_de=vp_de,
        cargo=cargo,
        activo=activo,
        password=password,
        nombre=nombre,
        apellidos=apellidos,
        dni=dni,
        email=nuevo_email,
        registro_id=registro_id,
        es_admin=es_admin,
        foto=foto,
        en_web=en_web,
        linkedin=linkedin,
    ):
        logger.info("admin actualiza acceso equipo id=%s", acceso_id)
        return jsonify(build_response(True, "Acceso actualizado.")), 200

    return jsonify(build_response(False, "Acceso no encontrado, o equipos/vp_de/cargo no válidos.")), 404


@admin_api.route("/equipo/pdf", methods=["GET"])
@requiere_admin
def api_admin_equipo_pdf():
    return send_file(
        generar_pdf_equipo_en_memoria(),
        as_attachment=True,
        download_name="miembros_equipo.pdf",
        mimetype="application/pdf",
    )


@admin_api.route("/equipo/excel", methods=["GET"])
@requiere_admin
def api_admin_equipo_excel():
    return send_file(
        generar_excel_equipo_en_memoria(),
        as_attachment=True,
        download_name="datos_equipo.xlsx",
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )


@admin_api.route("/equipo/<int:acceso_id>", methods=["DELETE"])
@requiere_admin
def api_admin_eliminar_equipo(acceso_id: int):
    if eliminar_equipo_acceso(acceso_id):
        logger.info("admin elimina acceso equipo id=%s", acceso_id)
        return jsonify(build_response(True, "Acceso eliminado.")), 200

    return jsonify(build_response(False, "Acceso no encontrado.")), 404


@admin_api.route("/auditoria", methods=["GET"])
@requiere_admin
def api_admin_auditoria():
    """Registro de auditoría (ver `services/auditoria.py`), lo último primero."""
    q = limpiar_texto(str(request.args.get("q", "")))[:120]
    limite = min(max(request.args.get("limite", 200, type=int), 1), 1000)
    return jsonify({"ok": True, "registros": auditoria.listar(q, limite)}), 200


_FECHA_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
_HORA_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")


def _validar_evento_calendario(payload: dict) -> str | None:
    """Devuelve un mensaje de error, o None si el evento es válido."""
    titulo = str(payload.get("titulo", "")).strip()
    fecha = str(payload.get("fecha", "")).strip()
    hora = str(payload.get("hora", "")).strip()
    descripcion = str(payload.get("descripcion", "")).strip()

    if not titulo or len(titulo) > 150:
        return "El título es obligatorio y debe tener como máximo 150 caracteres."
    if len(descripcion) > 500:
        return "La descripción debe tener como máximo 500 caracteres."
    if not _FECHA_RE.match(fecha):
        return "La fecha debe tener el formato AAAA-MM-DD."
    if hora and not _HORA_RE.match(hora):
        return "La hora debe tener el formato HH:MM, o dejarse vacía."
    return None


@admin_api.route("/calendario", methods=["GET"])
@requiere_admin
def api_admin_listar_calendario():
    return jsonify({"ok": True, "eventos": listar_eventos_calendario()}), 200


@admin_api.route("/calendario", methods=["POST"])
@requiere_admin
def api_admin_crear_calendario():
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
    logger.info("admin crea evento calendario id=%s", evento["id"])
    return jsonify(build_response(True, "Evento creado.", evento=evento)), 201


@admin_api.route("/calendario/<int:evento_id>", methods=["PUT"])
@requiere_admin
def api_admin_actualizar_calendario(evento_id: int):
    payload = request.get_json(silent=True) or {}
    error = _validar_evento_calendario(payload)
    if error:
        return jsonify(build_response(False, error)), 400

    if actualizar_evento_calendario(
        evento_id,
        limpiar_texto(str(payload.get("titulo", ""))),
        limpiar_texto(str(payload.get("descripcion", ""))),
        str(payload.get("fecha", "")).strip(),
        str(payload.get("hora", "")).strip(),
    ):
        logger.info("admin actualiza evento calendario id=%s", evento_id)
        return jsonify(build_response(True, "Evento actualizado.")), 200

    return jsonify(build_response(False, "Evento no encontrado.")), 404


@admin_api.route("/calendario/<int:evento_id>", methods=["DELETE"])
@requiere_admin
def api_admin_eliminar_calendario(evento_id: int):
    if eliminar_evento_calendario(evento_id):
        logger.info("admin elimina evento calendario id=%s", evento_id)
        return jsonify(build_response(True, "Evento eliminado.")), 200

    return jsonify(build_response(False, "Evento no encontrado.")), 404
