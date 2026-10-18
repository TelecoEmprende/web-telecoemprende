from io import BytesIO

import psycopg2
from openpyxl import Workbook

from backend.config import DATABASE_URL


# Las inscripciones están cerradas: pasado un año, los datos de quien se apuntó
# (email, teléfono, IP) ya no sirven para nada. Se quedan las que acabaron en
# una cuenta del equipo (`members.registration_id`).
DIAS_DE_INSCRIPCION = 365


def _get_connection():
    return psycopg2.connect(DATABASE_URL)


def purgar_inscripciones_antiguas() -> int:
    """Borra las inscripciones de hace más de `DIAS_DE_INSCRIPCION` que no
    están enlazadas a ninguna cuenta (cron diario). Devuelve cuántas."""
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                DELETE FROM registrations r
                WHERE r.created_at < NOW() - make_interval(days => %s)
                  AND NOT EXISTS (SELECT 1 FROM members a WHERE a.registration_id = r.id)
                """,
                (DIAS_DE_INSCRIPCION,),
            )
            borradas = cur.rowcount
        conn.commit()
    return borradas


def obtener_eventos() -> list[str]:
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT DISTINCT event FROM registrations ORDER BY event")
            rows = cur.fetchall()
    return [r[0] for r in rows]


def obtener_registros(evento: str | None = None):
    with _get_connection() as conn:
        with conn.cursor() as cur:
            if evento:
                cur.execute(
                    """
                    SELECT id, first_name, last_name, studies, email, department, drive_link,
                           privacy_accepted, ip_address, created_at, event, school, level, phone,
                           status, notified
                    FROM registrations
                    WHERE event = %s
                    ORDER BY id
                    """,
                    (evento,),
                )
            else:
                cur.execute(
                    """
                    SELECT id, first_name, last_name, studies, email, department, drive_link,
                           privacy_accepted, ip_address, created_at, event, school, level, phone,
                           status, notified
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
            "estado": r[14],
            "notificado": r[15],
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
                SET first_name = %s, last_name = %s, studies = %s, email = %s, department = %s,
                    drive_link = %s, school = %s, level = %s, phone = %s
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


def actualizar_estado(reg_id: int, estado: str) -> dict | None:
    """Actualiza el estado de una inscripción y la marca como no notificada
    (reclasificar siempre deja pendiente un nuevo envío manual desde el botón "Enviar")."""
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE registrations SET status = %s, notified = FALSE WHERE id = %s "
                "RETURNING id, first_name, last_name, email, event",
                (estado, reg_id),
            )
            row = cur.fetchone()
        conn.commit()

    if row is None:
        return None
    return {"id": row[0], "nombre": row[1], "apellidos": row[2], "email": row[3], "evento": row[4]}


def obtener_pendientes_notificacion(estado: str) -> list[dict]:
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, first_name, last_name, email FROM registrations "
                "WHERE status = %s AND notified = FALSE",
                (estado,),
            )
            rows = cur.fetchall()
    return [{"id": r[0], "nombre": r[1], "apellidos": r[2], "email": r[3]} for r in rows]


def marcar_notificado(reg_id: int) -> None:
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("UPDATE registrations SET notified = TRUE WHERE id = %s", (reg_id,))
        conn.commit()


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
        "Estado",
    ])

    anchos = {
        "A": 20, "B": 25, "C": 45, "D": 12, "E": 35, "F": 32,
        "G": 18, "H": 22, "I": 40, "J": 18, "K": 18, "L": 22, "M": 25, "N": 16,
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
            r["estado"],
        ])

    output = BytesIO()
    wb.save(output)
    output.seek(0)
    return output

