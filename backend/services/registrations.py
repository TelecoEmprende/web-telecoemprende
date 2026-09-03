from datetime import datetime
from io import BytesIO

import psycopg2
from openpyxl import Workbook

from backend.config import DATABASE_URL


def _get_connection():
    return psycopg2.connect(DATABASE_URL)


def init_db():
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS registrations (
                    id SERIAL PRIMARY KEY,
                    nombre VARCHAR(60) NOT NULL,
                    apellidos VARCHAR(100) NOT NULL,
                    estudios VARCHAR(120) NOT NULL,
                    email VARCHAR(120) NOT NULL,
                    drive_link VARCHAR(300) NOT NULL DEFAULT '',
                    privacidad_aceptada VARCHAR(10) NOT NULL,
                    ip_registro VARCHAR(45) NOT NULL,
                    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                    evento VARCHAR(50) NOT NULL,
                    CONSTRAINT registrations_email_evento_key UNIQUE (email, evento)
                )
            """)
            cur.execute("""
                ALTER TABLE registrations
                ADD COLUMN IF NOT EXISTS drive_link VARCHAR(300) NOT NULL DEFAULT ''
            """)
            cur.execute("""
                ALTER TABLE registrations
                ADD COLUMN IF NOT EXISTS departamento VARCHAR(40) NOT NULL DEFAULT ''
            """)
            cur.execute("""
                ALTER TABLE registrations
                ADD COLUMN IF NOT EXISTS escuela VARCHAR(150) NOT NULL DEFAULT ''
            """)
            cur.execute("""
                ALTER TABLE registrations
                ADD COLUMN IF NOT EXISTS nivel VARCHAR(20) NOT NULL DEFAULT ''
            """)
            cur.execute("""
                ALTER TABLE registrations
                ADD COLUMN IF NOT EXISTS telefono VARCHAR(20) NOT NULL DEFAULT ''
            """)
        conn.commit()


def crear_excel_si_no_existe():
    init_db()


def email_ya_registrado(email: str, evento: str) -> bool:
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT 1 FROM registrations WHERE LOWER(email) = LOWER(%s) AND evento = %s LIMIT 1",
                (email.strip(), evento),
            )
            return cur.fetchone() is not None


def guardar_registro(
    nombre: str,
    apellidos: str,
    estudios: str,
    email: str,
    departamento: str,
    drive_link: str,
    acepta_privacidad: str,
    ip: str,
    evento: str,
    escuela: str = "",
    nivel: str = "",
    telefono: str = "",
):
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO registrations
                    (nombre, apellidos, estudios, email, departamento, drive_link, privacidad_aceptada, ip_registro, created_at, evento, escuela, nivel, telefono)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    nombre,
                    apellidos,
                    estudios,
                    email.lower(),
                    departamento,
                    drive_link,
                    acepta_privacidad,
                    ip,
                    datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    evento,
                    escuela,
                    nivel,
                    telefono,
                ),
            )
        conn.commit()


def obtener_eventos() -> list[str]:
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT DISTINCT evento FROM registrations ORDER BY evento")
            rows = cur.fetchall()
    return [r[0] for r in rows]


def obtener_registros(evento: str | None = None):
    with _get_connection() as conn:
        with conn.cursor() as cur:
            if evento:
                cur.execute(
                    """
                    SELECT id, nombre, apellidos, estudios, email, departamento, drive_link,
                           privacidad_aceptada, ip_registro, created_at, evento, escuela, nivel, telefono
                    FROM registrations
                    WHERE evento = %s
                    ORDER BY id
                    """,
                    (evento,),
                )
            else:
                cur.execute(
                    """
                    SELECT id, nombre, apellidos, estudios, email, departamento, drive_link,
                           privacidad_aceptada, ip_registro, created_at, evento, escuela, nivel, telefono
                    FROM registrations
                    ORDER BY id
                    """
                )
            rows = cur.fetchall()

    return [
        {
            "id": r[0],
            "nombre": r[1],
            "apellidos": r[2],
            "estudios": r[3],
            "email": r[4],
            "departamento": r[5],
            "drive_link": r[6],
            "privacidad": r[7],
            "ip": r[8],
            "fecha": r[9].strftime("%Y-%m-%d %H:%M:%S") if hasattr(r[9], "strftime") else str(r[9]),
            "evento": r[10],
            "escuela": r[11],
            "nivel": r[12],
            "telefono": r[13],
        }
        for r in rows
    ]


def actualizar_registro(
    reg_id: int,
    nombre: str,
    apellidos: str,
    estudios: str,
    email: str,
    departamento: str,
    drive_link: str,
    escuela: str = "",
    nivel: str = "",
    telefono: str = "",
) -> bool:
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT 1 FROM registrations WHERE LOWER(email) = LOWER(%s) AND id != %s LIMIT 1",
                (email.strip(), reg_id),
            )
            if cur.fetchone() is not None:
                return False

            cur.execute(
                """
                UPDATE registrations
                SET nombre = %s, apellidos = %s, estudios = %s, email = %s, departamento = %s, drive_link = %s,
                    escuela = %s, nivel = %s, telefono = %s
                WHERE id = %s
                """,
                (
                    nombre.strip(),
                    apellidos.strip(),
                    estudios.strip(),
                    email.strip().lower(),
                    departamento.strip(),
                    drive_link.strip(),
                    escuela.strip(),
                    nivel.strip(),
                    telefono.strip(),
                    reg_id,
                ),
            )
        conn.commit()
    return True


def eliminar_registro(reg_id: int) -> bool:
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM registrations WHERE id = %s", (reg_id,))
            deleted = cur.rowcount > 0
        conn.commit()
    return deleted


_FORMULA_TRIGGER_CHARS = ("=", "+", "-", "@", "\t", "\r")


def _celda_segura(valor):
    """Neutraliza CSV/formula injection: Excel puede interpretar como fórmula
    cualquier valor de celda que empiece por =, +, -, @, tab o retorno de carro,
    ejecutando código en la máquina de quien abre el fichero. Como estos campos
    vienen de un formulario público, se antepone un apóstrofo para forzar texto."""
    if isinstance(valor, str) and valor.startswith(_FORMULA_TRIGGER_CHARS):
        return "'" + valor
    return valor


def generar_excel_en_memoria(evento: str | None = None) -> BytesIO:
    registros = obtener_registros(evento)

    wb = Workbook()
    ws = wb.active
    ws.title = "Inscripciones"
    ws.append([
        "Nombre",
        "Apellidos",
        "Escuela",
        "Nivel",
        "Estudios / Procedencia",
        "Correo electrónico",
        "Teléfono",
        "Departamento solicitado",
        "Enlace CV y pitch",
        "Acepta privacidad",
        "IP registro",
        "Fecha de registro",
        "Evento",
    ])

    anchos = {
        "A": 20, "B": 25, "C": 45, "D": 12, "E": 35, "F": 32,
        "G": 18, "H": 22, "I": 40, "J": 18, "K": 18, "L": 22, "M": 25,
    }
    for col, ancho in anchos.items():
        ws.column_dimensions[col].width = ancho

    for r in registros:
        ws.append([
            _celda_segura(r["nombre"]),
            _celda_segura(r["apellidos"]),
            _celda_segura(r["escuela"]),
            _celda_segura(r["nivel"]),
            _celda_segura(r["estudios"]),
            _celda_segura(r["email"]),
            _celda_segura(r["telefono"]),
            _celda_segura(r["departamento"]),
            _celda_segura(r["drive_link"]),
            r["privacidad"],
            r["ip"],
            r["fecha"],
            r["evento"],
        ])

    output = BytesIO()
    wb.save(output)
    output.seek(0)
    return output

