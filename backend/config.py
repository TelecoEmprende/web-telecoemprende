import os
from pathlib import Path


DATA_DIR = Path(os.environ.get("DATA_DIR", "."))
DATA_DIR.mkdir(parents=True, exist_ok=True)
EXCEL_FILE = DATA_DIR / "registros_evento.xlsx"
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "")
DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://telecoemprende:telecoemprende@localhost:5432/telecoemprende",
)

MAX_REQUESTS_PER_MINUTE = 8
BLOCK_WINDOW_SECONDS = 60
# Login es una superficie de fuerza bruta: límite propio, más estricto que el de registro.
MAX_LOGIN_ATTEMPTS_PER_WINDOW = 5
LOGIN_BLOCK_WINDOW_SECONDS = 300
ADMIN_SESSION_LIFETIME_SECONDS = 4 * 60 * 60
MAX_NOMBRE_LEN = 60
MAX_APELLIDOS_LEN = 100
MAX_ESTUDIOS_LEN = 120
MAX_ESCUELA_LEN = 150
MAX_NIVEL_LEN = 20
MAX_EMAIL_LEN = 120
MAX_TELEFONO_LEN = 20
MAX_DRIVE_LINK_LEN = 300
UPM_EMAIL_DOMAINS = ("alumnos.upm.es", "upm.es")

EVENTOS_VALIDOS = {
    "charla-santi-y-pablo",
    "telecoemprende-2026-27",
}

DEPARTAMENTOS_VALIDOS = {
    "Tech/Ingeniería",
    "Marketing/Comms",
    "Eventos/Logística",
}
