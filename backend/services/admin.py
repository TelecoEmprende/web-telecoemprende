from flask import session


def is_admin_authenticated() -> bool:
    """La da el login de /equipo a Ingeniería y al board (ver login_equipo):
    no hay contraseña maestra."""
    return session.get("admin_auth", False)


def logout_admin() -> None:
    session.clear()
