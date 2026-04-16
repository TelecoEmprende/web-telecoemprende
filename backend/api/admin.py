from flask import Blueprint, jsonify, make_response, render_template_string, request, send_file

from backend.config import EXCEL_FILE
from backend.schemas import build_response
from backend.services.admin import (
    admin_password_configured,
    is_admin_authenticated,
    login_admin,
    logout_admin,
)
from backend.services.registrations import crear_excel_si_no_existe, obtener_registros
from backend.services.security import demasiadas_peticiones, obtener_ip_real


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
              <h1>Esta ruta de administracion no esta disponible ahora mismo.</h1>
              <p>
                Has abierto un endpoint protegido de la API directamente en el navegador.
                Esa URL solo responde si existe una sesion de administrador activa.
              </p>
              <div class="message">{{ message }}</div>
              <div class="actions">
                <a class="primary" href="/admin">Ir al panel admin</a>
                <a class="secondary" href="/">Volver al inicio</a>
              </div>
              <p class="eyebrow">
                Si acabas de cerrar sesion, vuelve a autenticarte desde el panel antes de consultar registros.
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
                "El panel admin no esta configurado correctamente.",
            )),
            503,
        )

    ip = obtener_ip_real()
    if demasiadas_peticiones(ip):
        return (
            jsonify(build_response(False, "Demasiados intentos. Espera un minuto.")),
            429,
        )

    payload = request.get_json(silent=True) or {}
    password = str(payload.get("password", ""))

    if login_admin(password):
        return jsonify(build_response(True, "Sesion iniciada.")), 200

    return jsonify(build_response(False, "Contrasena incorrecta.")), 401


@admin_api.route("/logout", methods=["POST"])
def api_admin_logout():
    logout_admin()
    return jsonify(build_response(True, "Sesion cerrada correctamente.")), 200


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
    registros = obtener_registros()
    return jsonify({
        "ok": True,
        "total": len(registros),
        "registros": registros,
    }), 200


@admin_api.route("/download", methods=["GET"])
def api_admin_download():
    if not is_admin_authenticated():
        return access_denied_response("No autorizado.", 401)

    if not EXCEL_FILE.exists():
        if prefers_html_response():
            return access_denied_response(
                "No existe ningun archivo de registros todavia.",
                404,
            )
        return jsonify(build_response(
            False,
            "No existe ningun archivo de registros todavia.",
        )), 404

    return send_file(
        EXCEL_FILE,
        as_attachment=True,
        download_name="registros_telecoemprende.xlsx",
    )
