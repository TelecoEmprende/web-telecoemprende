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
                    privacidad_aceptada VARCHAR(10) NOT NULL,
                    ip_registro VARCHAR(45) NOT NULL,
                    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                    evento VARCHAR(50) NOT NULL,
                    CONSTRAINT registrations_email_evento_key UNIQUE (email, evento)
                )
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
    acepta_privacidad: str,
    ip: str,
    evento: str,
):
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO registrations
                    (nombre, apellidos, estudios, email, privacidad_aceptada, ip_registro, created_at, evento)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    nombre,
                    apellidos,
                    estudios,
                    email.lower(),
                    acepta_privacidad,
                    ip,
                    datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    evento,
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
                    SELECT id, nombre, apellidos, estudios, email,
                           privacidad_aceptada, ip_registro, created_at, evento
                    FROM registrations
                    WHERE evento = %s
                    ORDER BY id
                    """,
                    (evento,),
                )
            else:
                cur.execute(
                    """
                    SELECT id, nombre, apellidos, estudios, email,
                           privacidad_aceptada, ip_registro, created_at, evento
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
            "privacidad": r[5],
            "ip": r[6],
            "fecha": r[7].strftime("%Y-%m-%d %H:%M:%S") if hasattr(r[7], "strftime") else str(r[7]),
            "evento": r[8],
        }
        for r in rows
    ]


def actualizar_registro(reg_id: int, nombre: str, apellidos: str, estudios: str, email: str) -> bool:
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
                SET nombre = %s, apellidos = %s, estudios = %s, email = %s
                WHERE id = %s
                """,
                (nombre.strip(), apellidos.strip(), estudios.strip(), email.strip().lower(), reg_id),
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


def generar_excel_en_memoria(evento: str | None = None) -> BytesIO:
    registros = obtener_registros(evento)

    wb = Workbook()
    ws = wb.active
    ws.title = "Inscripciones"
    ws.append([
        "Nombre",
        "Apellidos",
        "Estudios / Procedencia",
        "Correo electrónico",
        "Acepta privacidad",
        "IP registro",
        "Fecha de registro",
        "Evento",
    ])

    anchos = {"A": 20, "B": 25, "C": 35, "D": 32, "E": 18, "F": 18, "G": 22, "H": 25}
    for col, ancho in anchos.items():
        ws.column_dimensions[col].width = ancho

    for r in registros:
        ws.append([
            r["nombre"],
            r["apellidos"],
            r["estudios"],
            r["email"],
            r["privacidad"],
            r["ip"],
            r["fecha"],
            r["evento"],
        ])

    output = BytesIO()
    wb.save(output)
    output.seek(0)
    return output

