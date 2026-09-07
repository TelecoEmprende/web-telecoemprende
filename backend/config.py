import os

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

ESTADOS_VALIDOS = {"pendiente", "aceptado", "rechazado", "waitlist"}

# Firma los enlaces de suscripción al calendario (.ics): con esto no hace
# falta guardar un token por persona en la base de datos, se recalcula.
CALENDARIO_TOKEN_SECRET = os.environ.get("FLASK_SECRET_KEY", "dev-calendario-token-secret")

EQUIPOS_VALIDOS = {"marketing", "eventos", "ingenieria"}
# Quien tenga este equipo recibe también sesión de admin al hacer login en /equipo.
EQUIPO_CON_PERMISOS_ADMIN = "ingenieria"

# Cargos de dirección, independientes del departamento: dan acceso a /admin
# igual que EQUIPO_CON_PERMISOS_ADMIN, sea cual sea su equipo (o ninguno).
CARGOS_VALIDOS = {"presidente", "boardmember"}

# Envío de email transaccional (Resend, https://resend.com). Si RESEND_API_KEY
# no está configurada, el envío se salta en silencio (ver services/email.py).
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
RESEND_FROM_EMAIL = os.environ.get("RESEND_FROM_EMAIL", "inscripciones@telecoemprende.es")
RESEND_FROM_NAME = os.environ.get("RESEND_FROM_NAME", "TelecoEmprende")

# --- Workspace de equipo: Marketing (campañas, contenidos, tareas) ---
# Ciclo de vida de una tarea: trabajo que alguien tiene que hacer.
TASK_ESTADOS = ("pendiente", "en_progreso", "por_revisar", "acabado")
TASK_PRIORIDADES = ("baja", "media", "alta")
# Ciclo de vida de un contenido: la pieza de comunicación en sí. Es distinto
# del de las tareas a propósito (un reel puede estar "en diseño" mientras su
# tarea de guion ya está "acabada").
CONTENT_ESTADOS = (
    "idea",
    "generado",
    "en_diseno",
    "en_revision",
    "programado",
    "publicado",
)
MAX_TITULO_LEN = 160
MAX_TEXTO_LARGO_LEN = 5000
MAX_RESPONSABLES = 20
MAX_ENLACES = 20
