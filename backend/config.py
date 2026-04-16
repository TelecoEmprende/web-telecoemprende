import os
from pathlib import Path


EXCEL_FILE = Path("registros_evento.xlsx")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "telecoemprende2026")

MAX_REQUESTS_PER_MINUTE = 8
BLOCK_WINDOW_SECONDS = 60
MAX_NOMBRE_LEN = 60
MAX_APELLIDOS_LEN = 100
MAX_ESTUDIOS_LEN = 120
MAX_EMAIL_LEN = 120
