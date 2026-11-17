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

    # Sin estilos propios a propósito: los colores de marca viven en
    # `frontend/src/styles/tokens.css`, y esto solo lo ve quien abre a mano una
    # descarga con la sesión caducada.
    html = render_template_string(
        """<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Acceso denegado | TelecoEmprende</title>
  </head>
  <body style="font-family: Inter, system-ui, sans-serif; max-width: 40rem; margin: 3rem auto; padding: 0 1rem;">
    <h1>Acceso denegado</h1>
    <p>{{ message }}</p>
    <p>Esta descarga necesita una sesión de admin. Si se te ha caducado, vuelve a entrar en /equipo y repite la descarga.</p>
    <p><a href="/equipo">Ir a /equipo</a> · <a href="/">Volver al inicio</a></p>
  </body>
</html>""",
        message=message,
    )
    response = make_response(html, status_code)
    response.headers["Content-Type"] = "text/html; charset=utf-8"
    return response
