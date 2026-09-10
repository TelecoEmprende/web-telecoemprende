from flask import (
    Flask,
    jsonify,
    request,
    send_file,
    send_from_directory,
    abort,
)
import os
import re
import secrets
from datetime import timedelta
from pathlib import Path
from werkzeug.middleware.proxy_fix import ProxyFix

from backend.api.admin import admin_api
from backend.api.cron import cron_api
from backend.api.equipo import equipo_api
from backend.api.marketing import marketing_api

# Importar por el efecto: `registros` cuelga sus rutas de `marketing_api`, y
# tiene que hacerlo ANTES de registrar el blueprint -- Flask no admite rutas
# nuevas en un blueprint ya registrado.
import backend.api.registros  # noqa: F401
from backend.api.public import public_api
from backend.config import ADMIN_SESSION_LIFETIME_SECONDS
from backend.schemas import build_response
from backend.services.registrations import crear_excel_si_no_existe

app = Flask(__name__)
# Vercel (y Nginx en Docker) hacen de proxy delante: sin esto, Flask no se fía
# de X-Forwarded-Proto y `url_for(..., _external=True)` genera enlaces
# `http://` en vez de `https://` -- justo el enlace de suscripción del
# calendario, que Google Calendar rechaza en silencio si no es https.
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)
app.register_blueprint(public_api)
app.register_blueprint(admin_api)
app.register_blueprint(equipo_api)
app.register_blueprint(cron_api)
# El mismo blueprint, una vez por departamento con workspace: mismas rutas bajo
# /api/marketing, /api/eventos y /api/ingenieria. `departamento_actual()`
# distingue de cuál viene la petición por el `name` del registro, y todas las
# consultas van acotadas por él.
app.register_blueprint(marketing_api)
app.register_blueprint(marketing_api, url_prefix="/api/eventos", name="eventos_api")
app.register_blueprint(
    marketing_api, url_prefix="/api/ingenieria", name="ingenieria_api"
)

# Usa una clave segura desde variable de entorno.
# Si no existe, genera una temporal para desarrollo.
app.secret_key = os.environ.get("FLASK_SECRET_KEY", secrets.token_hex(32))

# Configuración de cookies de sesión más segura
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_SECURE"] = True
# La sesión de admin expira sola tras un rato de inactividad/tiempo absoluto.
app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(seconds=ADMIN_SESSION_LIFETIME_SECONDS)

FRONTEND_DIST_DIR = Path("frontend/dist")
FRONTEND_ASSETS_DIR = FRONTEND_DIST_DIR / "assets"
FRONTEND_INDEX_FILE = FRONTEND_DIST_DIR / "index.html"


def serve_frontend_index():
    if not FRONTEND_INDEX_FILE.exists():
        abort(503, description="Frontend build not found. Run `npm run build` in `frontend/`.")

    return send_file(FRONTEND_INDEX_FILE)


@app.after_request
def aplicar_headers_seguridad(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    response.headers["Cache-Control"] = "no-store"
    response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
    # CSP sencilla. Si luego añades scripts inline o más servicios externos, habrá que ajustarla.
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "img-src 'self' data:; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src https://fonts.gstatic.com; "
        "script-src 'self'; "
        "connect-src 'self'; "
        "frame-ancestors 'none';"
    )
    return response


@app.route("/", methods=["GET"])
def index():
    crear_excel_si_no_existe()
    return serve_frontend_index()


# Las vistas del panel las resuelve el router de React, así que aquí solo hay
# que devolver el index en vez de un 404 (en Vercel ya lo hace el rewrite del
# servicio frontend; esto es para el Flask local). Se enumeran en vez de
# aceptar `<path:>`: un comodín volvería a servir rutas retiradas a propósito,
# como el viejo GET /admin/logout. Vista nueva en el router = vista nueva aquí.
@app.route("/admin", methods=["GET"])
@app.route("/admin/<any(inscripciones, equipo, calendario):_vista>", methods=["GET"])
def admin(_vista: str = ""):
    crear_excel_si_no_existe()
    return serve_frontend_index()


@app.route("/equipo", methods=["GET"])
def equipo():
    return serve_frontend_index()


@app.route("/privacidad", methods=["GET"])
def privacidad():
    return serve_frontend_index()


# Las dos rutas que faltaban del router de React: sin ellas, en local caían en
# el 404 de Flask (en Vercel las recoge el rewrite del servicio frontend, y en
# Docker el try_files de nginx, así que solo se notaba aquí).
@app.route("/gracias", methods=["GET"])
def gracias():
    return serve_frontend_index()


@app.route("/charla-santi-y-pablo", methods=["GET"])
def charla_santi_y_pablo():
    return serve_frontend_index()


@app.route("/assets/<path:filename>", methods=["GET"])
def frontend_assets(filename):
    if not FRONTEND_ASSETS_DIR.exists():
        abort(503, description="Frontend assets not found. Run `npm run build` in `frontend/`.")

    return send_from_directory(FRONTEND_ASSETS_DIR, filename)


@app.route("/logo.png", methods=["GET"])
def frontend_logo():
    if not FRONTEND_DIST_DIR.exists():
        abort(503, description="Frontend build not found. Run `npm run build` in `frontend/`.")

    return send_from_directory(FRONTEND_DIST_DIR, "logo.png")


@app.route("/robots.txt", methods=["GET"])
def frontend_robots():
    if not FRONTEND_DIST_DIR.exists():
        abort(503, description="Frontend build not found. Run `npm run build` in `frontend/`.")

    return send_from_directory(FRONTEND_DIST_DIR, "robots.txt")


# Imágenes sueltas de `frontend/dist` (fotos del equipo, logos de eventos...).
# En Vercel y en Nginx se sirve todo el directorio; aquí había solo reglas para
# /logo.png y /robots.txt, así que /equipo-abril.jpg daba 404 en local y las
# fotos de perfil salían como iniciales.
NOMBRE_IMAGEN = re.compile(r"^[\w.-]+\.(png|jpe?g|svg|webp|gif|ico)$")


@app.route("/<filename>", methods=["GET"])
def frontend_public_image(filename):
    # El patrón excluye "/" y "..", y send_from_directory vuelve a comprobarlo:
    # no se puede salir de dist con un nombre creativo.
    if not NOMBRE_IMAGEN.match(filename):
        abort(404)

    if not FRONTEND_DIST_DIR.exists():
        abort(503, description="Frontend build not found. Run `npm run build` in `frontend/`.")

    return send_from_directory(FRONTEND_DIST_DIR, filename)


def error_response(status_code: int, message: str):
    # /api/* lo consume fetch() en el front: le interesa JSON, no una página.
    if request.path.startswith("/api/"):
        return jsonify(build_response(False, message)), status_code

    pagina = FRONTEND_DIST_DIR / f"{status_code}.html"
    if pagina.exists():
        return send_file(pagina), status_code

    return message, status_code


@app.errorhandler(400)
def bad_request(_error):
    return error_response(400, "Solicitud no válida.")


@app.errorhandler(404)
def not_found(_error):
    return error_response(404, "Recurso no encontrado.")


@app.errorhandler(500)
def internal_error(_error):
    return error_response(500, "Error interno del servidor.")


if __name__ == "__main__":
    crear_excel_si_no_existe()
    app.run(host="0.0.0.0", port=5000, debug=True)
