from flask import session


def is_admin_authenticated() -> bool:
    """La da el login de /equipo a quien tiene `members.is_admin` (ver
    `login_equipo`), y `refrescar_sesion` la quita en cuanto la cuenta lo
    pierde. No hay contraseña maestra."""
    return session.get("admin_auth", False)


def logout_admin() -> None:
    session.clear()
