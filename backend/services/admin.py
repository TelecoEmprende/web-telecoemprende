import logging
import secrets

from flask import session

from backend.config import ADMIN_PASSWORD

logger = logging.getLogger("telecoemprende.admin")


def admin_password_configured() -> bool:
    return bool(ADMIN_PASSWORD)


def is_admin_authenticated() -> bool:
    return session.get("admin_auth", False)


def login_admin(password: str) -> bool:
    # Comparación en tiempo constante: evita filtrar por timing cuántos
    # caracteres iniciales de la contraseña son correctos.
    if not secrets.compare_digest(password, ADMIN_PASSWORD):
        return False

    session.clear()
    session.permanent = True
    session["admin_auth"] = True
    return True


def logout_admin() -> None:
    session.clear()

