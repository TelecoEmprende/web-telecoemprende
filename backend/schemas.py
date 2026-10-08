def build_response(ok: bool, message: str, **extra):
    response = {"ok": ok, "message": message}
    response.update(extra)
    return response

