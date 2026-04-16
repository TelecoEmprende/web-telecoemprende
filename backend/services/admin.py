from flask import session

from backend.config import ADMIN_PASSWORD


def admin_password_configured() -> bool:
    return bool(ADMIN_PASSWORD)


def is_admin_authenticated() -> bool:
    return session.get("admin_auth", False)


def login_admin(password: str) -> bool:
    if password != ADMIN_PASSWORD:
        return False

    session.clear()
    session["admin_auth"] = True
    return True


def logout_admin() -> None:
    session.clear()

