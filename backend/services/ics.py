"""Escapado de texto para .ics (RFC 5545).

Lo usan tanto el calendario de Marketing como el calendario general de
/equipo -- vive aparte para no repetir la misma función en los dos sitios.
"""


def escapar(texto: str) -> str:
    return texto.replace("\\", "\\\\").replace(",", "\\,").replace(";", "\\;").replace("\n", "\\n")
