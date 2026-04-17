from flask import (
    Flask,
    send_file,
    send_from_directory,
    abort,
)
import os
import secrets
from pathlib import Path

from backend.api.admin import admin_api
from backend.api.public import public_api
from backend.config import EXCEL_FILE
from backend.services.admin import is_admin_authenticated, logout_admin
from backend.services.registrations import crear_excel_si_no_existe

app = Flask(__name__)
app.register_blueprint(public_api)
app.register_blueprint(admin_api)

# Usa una clave segura desde variable de entorno.
# Si no existe, genera una temporal para desarrollo.
app.secret_key = os.environ.get("FLASK_SECRET_KEY", secrets.token_hex(32))

# Configuración de cookies de sesión más segura
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_SECURE"] = False  # Ponlo en True cuando uses HTTPS real

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


@app.route("/admin", methods=["GET"])
def admin():
    crear_excel_si_no_existe()
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


@app.route("/admin/logout")
def admin_logout():
    logout_admin()
    return serve_frontend_index()


@app.route("/admin/descargar")
def descargar_excel():
    autenticado = is_admin_authenticated()
    if not autenticado:
        abort(401, description="No autorizado.")

    if not EXCEL_FILE.exists():
        abort(404, description="No existe ningún archivo de registros todavía.")

    return send_file(
        EXCEL_FILE,
        as_attachment=True,
        download_name="registros_telecoemprende.xlsx"
    )


if __name__ == "__main__":
    crear_excel_si_no_existe()
    app.run(host="0.0.0.0", port=5000, debug=True)
