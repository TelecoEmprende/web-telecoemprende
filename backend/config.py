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
MAX_NOMBRE_LEN = 60
MAX_APELLIDOS_LEN = 100
MAX_ESTUDIOS_LEN = 120
MAX_EMAIL_LEN = 120
