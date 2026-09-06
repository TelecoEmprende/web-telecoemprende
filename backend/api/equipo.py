import logging

from flask import Blueprint, jsonify, request

from backend.config import LOGIN_BLOCK_WINDOW_SECONDS, MAX_LOGIN_ATTEMPTS_PER_WINDOW
from backend.schemas import build_response
from backend.services.equipo import (
    equipo_teams,
    init_equipo_db,
    is_equipo_authenticated,
    login_equipo,
    logout_equipo,
)
from backend.services.security import demasiadas_peticiones, limpiar_texto, obtener_ip_real

logger = logging.getLogger("telecoemprende.equipo")


equipo_api = Blueprint("equipo_api", __name__, url_prefix="/api/equipo")


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

    equipos = login_equipo(email, password)
    if equipos is not None:
        logger.info("equipo login success ip=%s", ip)
        return jsonify(build_response(True, "Sesión iniciada.", teams=equipos)), 200

    # Mensaje genérico: no revela si el email existe o no.
    logger.warning("equipo login failed ip=%s", ip)
    return jsonify(build_response(False, "Credenciales incorrectas.")), 401


@equipo_api.route("/logout", methods=["POST"])
def api_equipo_logout():
    logout_equipo()
    return jsonify(build_response(True, "Sesión cerrada correctamente.")), 200


@equipo_api.route("/session", methods=["GET"])
def api_equipo_session():
    authenticated = is_equipo_authenticated()
    return jsonify({
        "ok": True,
        "authenticated": authenticated,
        "teams": equipo_teams() if authenticated else [],
    }), 200
