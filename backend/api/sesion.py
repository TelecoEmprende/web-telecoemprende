"""Quién puede llamar a cada ruta de /api: con sesión de /equipo, o admin.

Todas las rutas con sesión cuelgan de uno de estos dos decoradores; los
permisos más finos (VP, cargo, dueño de la nota...) se miran dentro de cada
ruta. Un `DatosInvalidos` que se escape de cualquier ruta es un 400 (ver el
`errorhandler` de `app.py`).
"""

from functools import wraps

from flask import jsonify, make_response, render_template_string, request

from backend.schemas import build_response
from backend.services.admin import is_admin_authenticated
from backend.services.equipo import is_equipo_authenticated


def requiere_sesion(func):
    @wraps(func)
    def envoltorio(*args, **kwargs):
        if not is_equipo_authenticated():
            return jsonify(build_response(False, "No autorizado.")), 401
        return func(*args, **kwargs)

    return envoltorio


def requiere_admin(func):
    @wraps(func)
    def envoltorio(*args, **kwargs):
        if not is_admin_authenticated():
            return access_denied_response("No autorizado.", 401)
        return func(*args, **kwargs)

    return envoltorio


# Las descargas (Excel, PDF) se abren con un <a href>: si la sesión caducó,
# el navegador recibe una página y no un JSON suelto. Solo si pide text/html
# con todas las letras: `fetch` manda `*/*` y espera JSON.
def prefers_html_response() -> bool:
    return any(tipo == "text/html" for tipo, _ in request.accept_mimetypes)


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
