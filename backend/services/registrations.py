from datetime import datetime

from openpyxl import Workbook, load_workbook

from backend.config import EXCEL_FILE


def crear_excel_si_no_existe():
    if not EXCEL_FILE.exists():
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
        ])
        ajustar_columnas(ws)
        wb.save(EXCEL_FILE)


def ajustar_columnas(ws):
    anchos = {
        "A": 20,
        "B": 25,
        "C": 35,
        "D": 32,
        "E": 18,
        "F": 18,
        "G": 22,
    }
    for col, ancho in anchos.items():
        ws.column_dimensions[col].width = ancho


def email_ya_registrado(email: str) -> bool:
    if not EXCEL_FILE.exists():
        return False

    wb = load_workbook(EXCEL_FILE, read_only=True)
    ws = wb["Inscripciones"]

    for fila in ws.iter_rows(min_row=2, values_only=True):
        if fila[3] and str(fila[3]).strip().lower() == email.strip().lower():
            return True

    return False


def guardar_registro(
    nombre: str,
    apellidos: str,
    estudios: str,
    email: str,
    acepta_privacidad: str,
    ip: str,
):
    wb = load_workbook(EXCEL_FILE)
    ws = wb["Inscripciones"]

    fecha_registro = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    ws.append([
        nombre,
        apellidos,
        estudios,
        email.lower(),
        acepta_privacidad,
        ip,
        fecha_registro,
    ])

    ajustar_columnas(ws)
    wb.save(EXCEL_FILE)


def obtener_registros():
    if not EXCEL_FILE.exists():
        return []

    wb = load_workbook(EXCEL_FILE, data_only=True)
    ws = wb["Inscripciones"]

    registros = []
    for fila in ws.iter_rows(min_row=2, values_only=True):
        if any(fila):
            registros.append({
                "nombre": fila[0] or "",
                "apellidos": fila[1] or "",
                "estudios": fila[2] or "",
                "email": fila[3] or "",
                "privacidad": fila[4] or "",
                "ip": fila[5] or "",
                "fecha": fila[6] or "",
            })

    return registros

