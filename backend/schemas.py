REGISTRATION_FIELDS = (
    "nombre",
    "apellidos",
    "estudios",
    "email",
    "drive_link",
    "privacidad",
    "telefono_oculto",
)


def build_response(ok: bool, message: str, **extra):
    response = {"ok": ok, "message": message}
    response.update(extra)
    return response

