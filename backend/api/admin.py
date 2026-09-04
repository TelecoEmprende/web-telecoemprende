import logging

from flask import Blueprint, jsonify, make_response, render_template_string, request, send_file

from backend.config import (
    DEPARTAMENTOS_VALIDOS,
    ESTADOS_VALIDOS,
    LOGIN_BLOCK_WINDOW_SECONDS,
    MAX_LOGIN_ATTEMPTS_PER_WINDOW,
)
from backend.schemas import build_response
from backend.services.admin import (
    admin_password_configured,
    is_admin_authenticated,
    login_admin,
    logout_admin,
)
from backend.services.email import enviar_email_estado
from backend.services.registrations import (
    actualizar_estado,
    actualizar_registro,
    crear_excel_si_no_existe,
    eliminar_registro,
    generar_excel_en_memoria,
    marcar_notificado,
    obtener_eventos,
    obtener_pendientes_notificacion,
    obtener_registros,
)
from backend.services.security import (
    demasiadas_peticiones,
    drive_link_valido,
    email_upm_valido,
    limpiar_texto,
    longitud_valida,
    obtener_ip_real,
    telefono_valido,
)

logger = logging.getLogger("telecoemprende.admin")


admin_api = Blueprint("admin_api", __name__, url_prefix="/api/admin")


def prefers_html_response() -> bool:
    best = request.accept_mimetypes.best_match(["text/html", "application/json"])
    return best == "text/html" and (
        request.accept_mimetypes["text/html"]
        >= request.accept_mimetypes["application/json"]
    )


def access_denied_response(message: str, status_code: int = 401):
    if not prefers_html_response():
        return jsonify(build_response(False, message)), status_code

    html = render_template_string(
        """
        <!doctype html>
        <html lang="es">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Acceso denegado | TelecoEmprende</title>
            <style>
              :root {
                --primary: #0f5cc0;
                --danger: #b42318;
                --danger-soft: #fde8ea;
                --text: #0f172a;
                --muted: #5f6c80;
                --border: #dce3ee;
                --surface: rgba(255, 255, 255, 0.88);
              }

              * { box-sizing: border-box; }

              body {
                margin: 0;
                min-height: 100vh;
                display: grid;
                place-items: center;
                padding: 24px;
                font-family: Inter, sans-serif;
                color: var(--text);
                background:
                  radial-gradient(circle at top left, rgba(15, 92, 192, 0.08), transparent 28%),
                  radial-gradient(circle at top right, rgba(243, 198, 165, 0.12), transparent 24%),
                  linear-gradient(180deg, #f7f9fc 0%, #eef3f9 100%);
              }

              .card {
                width: min(100%, 760px);
                background: var(--surface);
                border: 1px solid var(--border);
                border-radius: 32px;
                padding: 36px 32px;
                box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08);
                backdrop-filter: blur(8px);
              }

              .badge {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                padding: 10px 14px;
                border-radius: 999px;
                background: var(--danger-soft);
                color: var(--danger);
                font-size: 0.82rem;
                font-weight: 800;
                letter-spacing: 0.06em;
                text-transform: uppercase;
              }

              h1 {
                margin: 18px 0 12px;
                font-size: clamp(2rem, 4vw, 3.2rem);
                line-height: 0.98;
                letter-spacing: -0.05em;
              }

              p {
                margin: 0 0 14px;
                color: var(--muted);
                line-height: 1.7;
                max-width: 58ch;
              }

              .message {
                margin-top: 22px;
                padding: 16px 18px;
                border-radius: 18px;
                background: #fff;
                border: 1px solid #f0d5d8;
                color: var(--text);
                font-weight: 700;
              }

              .actions {
                display: flex;
                flex-wrap: wrap;
                gap: 14px;
                margin-top: 26px;
              }

              .primary,
              .secondary {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-height: 52px;
                padding: 0 18px;
                border-radius: 16px;
                text-decoration: none;
                font-weight: 800;
              }

              .primary {
                background: linear-gradient(135deg, var(--primary), #0b67d4);
                color: #fff;
                box-shadow: 0 20px 50px rgba(15, 92, 192, 0.12);
              }

              .secondary {
                background: #fff;
                color: var(--text);
                border: 1px solid var(--border);
              }

              .eyebrow {
                margin-top: 24px;
                color: var(--muted);
                font-size: 0.95rem;
              }
            </style>
          </head>
          <body>
            <main class="card">
              <div class="badge">Acceso denegado</div>
              <h1>Esta ruta de administración no está disponible ahora mismo.</h1>
              <p>
                Has abierto un endpoint protegido de la API directamente en el navegador.
                Esa URL solo responde si existe una sesión de administrador activa.
              </p>
              <div class="message">{{ message }}</div>
              <div class="actions">
                <a class="primary" href="/admin">Ir al panel admin</a>
                <a class="secondary" href="/">Volver al inicio</a>
              </div>
              <p class="eyebrow">
                Si acabas de cerrar sesión, vuelve a autenticarte desde el panel antes de consultar registros.
              </p>
            </main>
          </body>
        </html>
        """,
        message=message,
    )
    response = make_response(html, status_code)
    response.headers["Content-Type"] = "text/html; charset=utf-8"
    return response


@admin_api.route("/login", methods=["POST"])
def api_admin_login():
    crear_excel_si_no_existe()

    if not admin_password_configured():
        return (
            jsonify(build_response(
                False,
                "El panel admin no está configurado correctamente.",
            )),
            503,
        )

    ip = obtener_ip_real()
    if demasiadas_peticiones(
        ip,
        max_requests=MAX_LOGIN_ATTEMPTS_PER_WINDOW,
        window_seconds=LOGIN_BLOCK_WINDOW_SECONDS,
        bucket="admin_login",
    ):
        logger.warning("admin login rate-limited ip=%s", ip)
        return (
            jsonify(build_response(False, "Demasiados intentos. Espera unos minutos.")),
            429,
        )

    payload = request.get_json(silent=True) or {}
    password = str(payload.get("password", ""))

    if login_admin(password):
        logger.info("admin login success ip=%s", ip)
        return jsonify(build_response(True, "Sesión iniciada.")), 200

    logger.warning("admin login failed ip=%s", ip)
    return jsonify(build_response(False, "Contraseña incorrecta.")), 401


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
def api_admin_registrations():
    if not is_admin_authenticated():
        return access_denied_response("No autorizado.", 401)

    crear_excel_si_no_existe()
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
def api_admin_download():
    if not is_admin_authenticated():
        return access_denied_response("No autorizado.", 401)

    evento = request.args.get("evento") or None
    filename = f"registros_{evento}.xlsx" if evento else "registros_todos.xlsx"
    return send_file(
        generar_excel_en_memoria(evento),
        as_attachment=True,
        download_name=filename,
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )


@admin_api.route("/registrations/<int:reg_id>", methods=["PUT"])
def api_admin_update_registration(reg_id: int):
    if not is_admin_authenticated():
        return jsonify(build_response(False, "No autorizado.")), 401

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
def api_admin_update_estado(reg_id: int):
    if not is_admin_authenticated():
        return jsonify(build_response(False, "No autorizado.")), 401

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
def api_admin_notificar():
    """Envía (ahora, no antes) el email de estado a todos los registros del estado
    dado que aún no han sido notificados. Clasificar (PATCH .../estado) nunca envía
    solo por sí mismo: hace falta pulsar "Enviar notificaciones" en el panel."""
    if not is_admin_authenticated():
        return jsonify(build_response(False, "No autorizado.")), 401

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
def api_admin_delete_registration(reg_id: int):
    if not is_admin_authenticated():
        return jsonify(build_response(False, "No autorizado.")), 401

    if eliminar_registro(reg_id):
        logger.info("admin delete registration id=%s", reg_id)
        return jsonify(build_response(True, "Registro eliminado.")), 200

    return jsonify(build_response(False, "Registro no encontrado.")), 404
