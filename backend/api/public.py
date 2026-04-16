from flask import Blueprint, jsonify, request

from backend.schemas import build_response
from backend.services.registrations import (
    crear_excel_si_no_existe,
    email_ya_registrado,
    guardar_registro,
)
from backend.services.security import (
    demasiadas_peticiones,
    email_valido,
    limpiar_texto,
    longitud_valida,
    obtener_ip_real,
)


public_api = Blueprint("public_api", __name__, url_prefix="/api")


@public_api.route("/registrations", methods=["POST"])
def create_registration():
    crear_excel_si_no_existe()

    ip = obtener_ip_real()
    if demasiadas_peticiones(ip):
        return (
            jsonify(build_response(
                False,
                "Demasiadas solicitudes desde esta red. Intentalo en un minuto.",
            )),
            429,
        )

    payload = request.get_json(silent=True) or {}

    telefono_oculto = str(payload.get("telefono_oculto", "")).strip()
    if telefono_oculto:
        return "", 204

    nombre = limpiar_texto(str(payload.get("nombre", "")))
    apellidos = limpiar_texto(str(payload.get("apellidos", "")))
    estudios = limpiar_texto(str(payload.get("estudios", "")))
    email = limpiar_texto(str(payload.get("email", ""))).lower()
    acepta_privacidad = payload.get("privacidad")

    errors = {}

    if not nombre:
        errors["nombre"] = "Completa este campo."
    if not apellidos:
        errors["apellidos"] = "Completa este campo."
    if not estudios:
        errors["estudios"] = "Completa este campo."
    if not email:
        errors["email"] = "Completa este campo."
    if not acepta_privacidad:
        errors["privacidad"] = (
            "Debes aceptar la politica de privacidad para registrarte."
        )

    if errors:
        return (
            jsonify(build_response(
                False,
                "Hay errores de validacion.",
                errors=errors,
            )),
            400,
        )

    if not longitud_valida(nombre, apellidos, estudios, email):
        return (
            jsonify(build_response(
                False,
                "Alguno de los campos supera la longitud permitida.",
            )),
            400,
        )

    if not email_valido(email):
        return (
            jsonify(build_response(
                False,
                "Hay errores de validacion.",
                errors={"email": "Introduce un correo electronico valido."},
            )),
            400,
        )

    if email_ya_registrado(email):
        return (
            jsonify(build_response(False, "Ese correo ya esta registrado.")),
            409,
        )

    guardar_registro(
        nombre=nombre,
        apellidos=apellidos,
        estudios=estudios,
        email=email,
        acepta_privacidad="Sí",
        ip=ip,
    )

    return (
        jsonify(build_response(
            True,
            "Registro completado. Te contactaremos pronto con la informacion del evento.",
        )),
        201,
    )

