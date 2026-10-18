import base64
import hashlib
import secrets
from io import BytesIO

import psycopg2
from fpdf import FPDF
from flask import session
from openpyxl import Workbook
from openpyxl.drawing.image import Image as XLImage
from werkzeug.security import check_password_hash, generate_password_hash

from backend.config import (
    CARGOS_VALIDOS,
    DATABASE_URL,
    EQUIPOS_ORDEN_POR_DEFECTO,
    MINUTOS_ENLACE_CLAVE,
    EQUIPOS_VALIDOS,
)
from backend.services.registrations import _celda_segura

# Hash "de relleno" para cuando el email no existe: sin esto, saltarse
# check_password_hash en ese caso haría que la respuesta fuera más rápida
# para emails no registrados, filtrando por tiempo qué correos están de alta.
_DUMMY_HASH = generate_password_hash("no-existe-ningun-usuario-con-este-email")


def _get_connection():
    return psycopg2.connect(DATABASE_URL)


# La inscripción de la que sale una cuenta nueva: la más reciente con su email.
# Quien se inscribió con otro correo se vincula a mano (`registro_id` en
# `actualizar_equipo_acceso`).
_INSCRIPCION = (
    "(SELECT id FROM registrations WHERE lower(email) = %s ORDER BY created_at DESC LIMIT 1)"
)


def ordenar_equipos(equipos: list[str]) -> list[str]:
    """Sin duplicados y en el orden en que llegan: el primero es la 1ª
    preferencia de la persona, el segundo la 2ª y el tercero la 3ª (no se
    ordena alfabéticamente, que perdería esa información)."""
    return list(dict.fromkeys(equipos))


def completar_equipos(equipos: list[str]) -> list[str]:
    """Todos somos de los tres departamentos: respeta el orden de preferencia
    que hay y añade al final los que falten, en el orden por defecto."""
    ordenados = [e for e in ordenar_equipos(equipos) if e in EQUIPOS_VALIDOS]
    return ordenados + [e for e in EQUIPOS_ORDEN_POR_DEFECTO if e not in ordenados]


def login_equipo(email: str, password: str) -> dict | None:
    email = email.strip().lower()
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT password_hash, preferred_departments, vp_of, role, first_name,
                       COALESCE(is_admin, FALSE), must_change_password
                FROM members WHERE email = %s AND active = TRUE
                """,
                (email,),
            )
            row = cur.fetchone()

    password_hash = row[0] if row is not None else _DUMMY_HASH
    password_ok = check_password_hash(password_hash, password)

    if row is None or not password_ok:
        return None

    equipos = completar_equipos(row[1])
    vp_de = [e for e in row[2] if e in equipos]
    cargo = row[3] if row[3] in CARGOS_VALIDOS else ""
    nombre = row[4]
    es_admin = bool(row[5])
    cambiar_clave = bool(row[6])

    # session.clear() por higiene ante fijación de sesión.
    session.clear()
    session.permanent = True
    session["equipo_email"] = email
    session["equipo_teams"] = equipos
    session["equipo_vp_de"] = vp_de
    session["equipo_cargo"] = cargo
    session["equipo_nombre"] = nombre
    session["equipo_admin"] = es_admin
    session["equipo_cambiar_clave"] = cambiar_clave
    # Solo quien tiene el permiso de admin marcado (no el departamento ni el
    # cargo) recibe la sesión de admin: grupo Admin y rutas /api/admin/*.
    if es_admin:
        session["admin_auth"] = True
    return {
        "teams": equipos, "vp_de": vp_de, "cargo": cargo, "nombre": nombre,
        "admin": es_admin, "cambiar_clave": cambiar_clave,
    }


def is_equipo_authenticated() -> bool:
    return "equipo_email" in session


def equipo_session_info() -> dict:
    return {
        # Sesiones abiertas antes de que todos fuéramos de los tres
        # departamentos traen la lista vieja: se completa al leerla.
        "teams": completar_equipos(session.get("equipo_teams", [])),
        "vp_de": session.get("equipo_vp_de", []),
        "cargo": session.get("equipo_cargo", ""),
        "email": session.get("equipo_email", ""),
        "nombre": session.get("equipo_nombre", ""),
        "admin": session.get("equipo_admin", False),
        "cambiar_clave": session.get("equipo_cambiar_clave", False),
    }


def logout_equipo() -> None:
    session.clear()



# Versión de la foto para su enlace (`url_foto`), calculada en la base de
# datos: así los listados no se traen cada foto entera solo para hashearla.
_FOTO_V = "CASE WHEN photo <> '' THEN left(md5(photo), 10) ELSE '' END"


def listar_equipo_accesos() -> list[dict]:
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT id, email, preferred_departments, vp_of, role, active, created_at,
                       tags, notes, first_name, id_document,
                       {_FOTO_V}, last_name, COALESCE(is_admin, FALSE),
                       COALESCE(on_website, FALSE), registration_id, linkedin
                FROM members ORDER BY email
                """
            )
            filas = cur.fetchall()

    return [
        {
            "id": f[0],
            "email": f[1],
            "equipos": completar_equipos(f[2]),
            "vp_de": f[3],
            "cargo": f[4],
            "activo": f[5],
            "created_at": f[6].isoformat(),
            "tags": f[7],
            "notas": f[8],
            "nombre": f[9],
            "dni": f[10],
            "foto": url_foto(f[0], f[11]),
            "apellidos": f[12],
            "es_admin": f[13],
            "en_web": f[14],
            "registro_id": f[15],
            "linkedin": f[16],
        }
        for f in filas
    ]


# Orden en la web: presidencia, board, VPs y luego el resto.
_RANGO_WEB = {"presidente": 0, "boardmember": 1, "vicepresidente": 2}

_DEPTO_WEB = {
    "marketing": ("Marketing", "Marketing"),
    "eventos": ("Eventos", "Events"),
    "ingenieria": ("Ingeniería", "Engineering"),
}


def puesto_web(cargo: str, vp_de: list[str]) -> dict | None:
    """El puesto que sale bajo el nombre en la web, en español e inglés: solo
    para presidencia, board y VPs (de su departamento); el resto, nada."""
    if cargo == "presidente":
        return {"es": "Presidente", "en": "President"}
    if cargo == "boardmember":
        return {"es": "Board member", "en": "Board member"}
    deptos = [d for d in vp_de if d in _DEPTO_WEB]
    if deptos:
        return {
            "es": "VP de " + " y ".join(_DEPTO_WEB[d][0] for d in deptos),
            "en": "VP of " + " & ".join(_DEPTO_WEB[d][1] for d in deptos),
        }
    if cargo == "vicepresidente":
        return {"es": "Vicepresidente", "en": "Vice President"}
    return None


def url_foto(acceso_id: int, version: str) -> str:
    """Las fotos se guardan enteras en `members.photo` (data URL), pero a la
    API salen como enlace a `/api/equipo/foto/<id>`: así no viajan todas
    dentro de cada JSON y el navegador las guarda en caché. `version` es
    `_FOTO_V` y cambia con la foto, así que una foto nueva nunca sale de una
    caché vieja; vacía, no hay foto."""
    return f"/api/equipo/foto/{acceso_id}?v={version}" if version else ""


def foto_de(acceso_id: int) -> tuple[str, bool] | None:
    """`(data URL, sale en la web)` de una cuenta, o None si no existe."""
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT photo, on_website FROM members WHERE id = %s", (acceso_id,))
            fila = cur.fetchone()
    return (fila[0], bool(fila[1])) if fila else None


def listar_miembros_web() -> list[dict]:
    """Quién sale en la sección «Equipo» de la web pública: cuentas marcadas
    `en_web` y con foto subida. Ruta pública, así que solo viaja nombre,
    primer apellido, foto, LinkedIn y, si lo tiene, su puesto (`puesto_web`); nada de
    email, DNI ni departamentos.
    """
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT first_name, last_name, {_FOTO_V}, role, vp_of, linkedin, id
                FROM members
                WHERE on_website AND first_name <> '' AND photo <> ''
                """
            )
            filas = cur.fetchall()

    filas.sort(key=lambda f: (_RANGO_WEB.get(f[3], 2 if f[4] else 3), f[0].lower()))
    return [
        {
            "nombre": f[0],
            "apellido": (f[1].split() or [""])[0],
            "foto": url_foto(f[6], f[2]),
            "puesto": puesto_web(f[3], f[4]),
            "linkedin": f[5],
        }
        for f in filas
    ]


def generar_pdf_equipo_en_memoria() -> BytesIO:
    """Listado de todos los accesos de equipo en PDF, para imprimir o
    archivar (p. ej. registro de socios) -- ver `api/admin.py`."""
    accesos = listar_equipo_accesos()

    pdf = FPDF(orientation="L", unit="mm", format="A4")
    pdf.set_auto_page_break(auto=True, margin=12)
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 10, "TelecoEmprende -- Miembros del equipo", new_x="LMARGIN", new_y="NEXT")

    columnas = [
        ("Nombre", 45), ("Email", 65), ("DNI", 30),
        ("Preferencias", 65), ("Cargo", 30), ("Activo", 20),
    ]
    pdf.set_font("Helvetica", "B", 9)
    for titulo, ancho in columnas:
        pdf.cell(ancho, 8, titulo, border=1)
    pdf.ln()

    pdf.set_font("Helvetica", "", 9)
    for acceso in accesos:
        valores = [
            acceso["nombre"] or "-",
            acceso["email"],
            acceso["dni"] or "-",
            ", ".join(acceso["equipos"]) or "-",
            acceso["cargo"] or "-",
            "Sí" if acceso["activo"] else "No",
        ]
        for (_, ancho), valor in zip(columnas, valores):
            texto = valor.encode("latin-1", "replace").decode("latin-1")
            pdf.cell(ancho, 7, texto, border=1)
        pdf.ln()

    return BytesIO(bytes(pdf.output()))


def generar_excel_equipo_en_memoria() -> BytesIO:
    """Datos personales de todo el equipo (lo que cada cual rellena en su
    perfil) con sus preferencias de departamento y cargo, y la foto
    incrustada en la última columna -- ver `api/admin.py`."""
    accesos = listar_equipo_accesos()
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, photo FROM members WHERE photo <> ''")
            fotos = dict(cur.fetchall())

    wb = Workbook()
    ws = wb.active
    ws.title = "Equipo"
    ws.append([
        "Nombre", "Apellidos", "DNI/NIE/Pasaporte",
        "Email de acceso", "Preferencias", "VP de", "Cargo", "Activo", "Foto",
    ])
    for col, ancho in zip("ABCDEFGHI", (20, 25, 18, 32, 30, 20, 14, 8, 12)):
        ws.column_dimensions[col].width = ancho

    for fila, a in enumerate(accesos, start=2):
        ws.append([
            _celda_segura(a["nombre"]),
            _celda_segura(a["apellidos"]),
            _celda_segura(a["dni"]),
            _celda_segura(a["email"]),
            ", ".join(a["equipos"]),
            ", ".join(a["vp_de"]),
            a["cargo"],
            "Sí" if a["activo"] else "No",
        ])
        if a["id"] in fotos:
            # La foto ya pasó `_foto` al guardarse (data URL validado), así que
            # aquí basta con decodificarla.
            imagen = XLImage(BytesIO(base64.b64decode(fotos[a["id"]].split(",", 1)[1])))
            imagen.width = imagen.height = 64
            ws.add_image(imagen, f"I{fila}")
            ws.row_dimensions[fila].height = 50

    output = BytesIO()
    wb.save(output)
    output.seek(0)
    return output


def cambiar_password(email: str, actual: str, nueva: str) -> bool:
    """False si la contraseña actual no coincide."""
    email = email.strip().lower()
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT password_hash FROM members WHERE email = %s AND active = TRUE",
                (email,),
            )
            fila = cur.fetchone()
            if fila is None or not check_password_hash(fila[0], actual):
                return False
            cur.execute(
                "UPDATE members SET password_hash = %s, must_change_password = FALSE"
                " WHERE email = %s",
                (generate_password_hash(nueva), email),
            )
        conn.commit()
    return True


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def crear_token_recuperacion(email: str) -> tuple[str, str] | None:
    """Un enlace de un solo uso para elegir contraseña nueva: devuelve
    `(token, nombre)`, o None si no hay cuenta activa con ese correo o ya se
    pidió hace nada (dos minutos: así nadie llena un buzón ajeno a base de
    peticiones). Pedir uno nuevo anula los anteriores."""
    email = email.strip().lower()
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, first_name FROM members WHERE email = %s AND active = TRUE", (email,)
            )
            fila = cur.fetchone()
            if fila is None:
                return None
            persona_id, nombre = fila
            cur.execute(
                "SELECT 1 FROM password_resets WHERE member_id = %s"
                " AND created_at > NOW() - interval '2 minutes'",
                (persona_id,),
            )
            if cur.fetchone() is not None:
                return None
            token = secrets.token_urlsafe(32)
            cur.execute("DELETE FROM password_resets WHERE member_id = %s", (persona_id,))
            cur.execute(
                "INSERT INTO password_resets (token_hash, member_id, expires_at)"
                " VALUES (%s, %s, NOW() + make_interval(mins => %s))",
                (_hash_token(token), persona_id, MINUTOS_ENLACE_CLAVE),
            )
        conn.commit()
    return token, nombre


def canjear_token_recuperacion(token: str, nueva: str) -> bool:
    """Pone la contraseña nueva si el enlace es de verdad, no ha caducado y no
    se ha usado. Se gasta al usarlo."""
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM password_resets WHERE token_hash = %s AND expires_at > NOW()"
                " RETURNING member_id",
                (_hash_token(token),),
            )
            fila = cur.fetchone()
            if fila is None:
                return False
            cur.execute(
                "UPDATE members SET password_hash = %s, must_change_password = FALSE"
                " WHERE id = %s AND active = TRUE",
                (generate_password_hash(nueva), fila[0]),
            )
            # Cualquier otro enlace pendiente de esa cuenta también se gasta.
            cur.execute("DELETE FROM password_resets WHERE member_id = %s", (fila[0],))
        conn.commit()
    return True


def poner_clave_provisional(acceso_id: int) -> str | None:
    """Para quien no puede usar el enlace por correo: un admin le pone una
    contraseña provisional y la persona tiene que cambiarla al entrar. Se
    devuelve una sola vez; en la base solo queda su hash."""
    provisional = secrets.token_urlsafe(9)
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE members SET password_hash = %s, must_change_password = TRUE WHERE id = %s",
                (generate_password_hash(provisional), acceso_id),
            )
            hecho = cur.rowcount > 0
        conn.commit()
    return provisional if hecho else None


def datos_formulario(email: str) -> dict | None:
    """El perfil de la propia persona: lo que ella misma puede corregir."""
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT first_name, last_name, id_document, linkedin, {_FOTO_V}, id
                FROM members WHERE email = %s
                """,
                (email.strip().lower(),),
            )
            f = cur.fetchone()
    if f is None:
        return None
    return {
        "nombre": f[0], "apellidos": f[1], "dni": f[2], "linkedin": f[3],
        "foto": url_foto(f[5], f[4]),
    }


def guardar_datos_formulario(
    email: str, nombre: str, apellidos: str, dni: str, linkedin: str, foto: str | None
) -> bool:
    """Perfil que corrige la propia persona. `foto=None` deja la que ya tenía
    (no hace falta volver a subirla para corregir un apellido)."""
    campos = ["first_name = %s", "last_name = %s", "id_document = %s", "linkedin = %s"]
    valores: list = [nombre, apellidos, dni, linkedin]
    if foto is not None:
        campos.append("photo = %s")
        valores.append(foto)
    valores.append(email.strip().lower())
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE members SET {', '.join(campos)} WHERE email = %s",
                valores,
            )
            actualizado = cur.rowcount > 0
        conn.commit()
    return actualizado


def miembros_activos(equipo: str) -> list[dict]:
    """Los accesos activos de un departamento (hoy todos: ver `completar_equipos`) -- filtro que reutilizan el
    directorio de marketing (`api_miembros`) y `salud_equipo`, para no tener
    la misma condición escrita dos veces."""
    return [a for a in listar_equipo_accesos() if equipo in a["equipos"] and a["activo"]]


def _acceso_valido(equipos: list[str], vp_de: list[str], cargo: str) -> bool:
    """Departamentos y cargo válidos, y los VP solo de departamentos de la
    persona. Que `equipos` lleve los tres se exige en la API al cambiarlos,
    no aquí: una fila antigua se puede seguir editando sin arreglarla antes.
    """
    if cargo and cargo not in CARGOS_VALIDOS:
        return False
    if any(e not in EQUIPOS_VALIDOS for e in equipos):
        return False
    return all(v in equipos for v in vp_de)


def crear_equipo_acceso(
    email: str,
    password: str,
    equipos: list[str],
    vp_de: list[str] | None = None,
    cargo: str = "",
    nombre: str = "",
    es_admin: bool = False,
    apellidos: str = "",
) -> dict | None:
    """Devuelve None si el email ya existe o si equipos/vp_de/cargo no son válidos."""
    email = email.strip().lower()
    equipos = completar_equipos(equipos)
    vp_de = sorted(set(vp_de or []))
    cargo = cargo or ""
    nombre = (nombre or "").strip()

    if not _acceso_valido(equipos, vp_de, cargo):
        return None

    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM members WHERE email = %s", (email,))
            if cur.fetchone() is not None:
                return None

            cur.execute(
                f"""
                INSERT INTO members
                    (email, password_hash, preferred_departments, vp_of, role, first_name,
                     is_admin, last_name, must_change_password, registration_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, TRUE, {_INSCRIPCION})
                RETURNING id, email, preferred_departments, vp_of, role, active, created_at,
                          first_name, is_admin, last_name
                """,
                (
                    email, generate_password_hash(password), equipos, vp_de, cargo, nombre,
                    es_admin, (apellidos or "").strip(), email,
                ),
            )
            fila = cur.fetchone()
        conn.commit()

    return {
        "id": fila[0],
        "email": fila[1],
        "equipos": fila[2],
        "vp_de": fila[3],
        "cargo": fila[4],
        "activo": fila[5],
        "created_at": fila[6].isoformat(),
        "nombre": fila[7],
        "es_admin": fila[8],
        "apellidos": fila[9],
    }


def registrar_equipo_acceso(email: str, password: str) -> bool:
    """Alta que se pide la propia persona: cuenta desactivada y sin equipos.

    No pasa por `_acceso_valido` a propósito -- la cuenta nace justamente sin
    nada (equipos '{}', cargo ''), y con `activo = FALSE` no puede iniciar
    sesión (ver `login_equipo`), así que no da acceso a nada hasta que admin le
    asigna equipos/cargo y la activa desde el panel.

    `ON CONFLICT DO NOTHING` en vez de SELECT + INSERT: una sola sentencia, sin
    carrera entre dos altas del mismo email a la vez. Devuelve False si ya
    existía.

    ponytail: alta temporal mientras entra el equipo. Para quitarla, borrar
    esta función, la ruta POST /api/equipo/registro y el modo "crear cuenta"
    del formulario de login.
    """
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                INSERT INTO members (email, password_hash, active, registration_id)
                VALUES (%s, %s, FALSE, {_INSCRIPCION})
                ON CONFLICT (email) DO NOTHING
                """,
                (email.strip().lower(), generate_password_hash(password), email.strip().lower()),
            )
            creado = cur.rowcount > 0
        conn.commit()

    return creado


def actualizar_equipo_acceso(
    acceso_id: int,
    equipos: list[str] | None = None,
    vp_de: list[str] | None = None,
    cargo: str | None = None,
    activo: bool | None = None,
    password: str | None = None,
    nombre: str | None = None,
    apellidos: str | None = None,
    dni: str | None = None,
    email: str | None = None,
    registro_id: int | None = None,
    es_admin: bool | None = None,
    foto: str | None = None,
    en_web: bool | None = None,
    linkedin: str | None = None,
) -> bool:
    """Actualiza solo los campos que se pasan. Devuelve False si el id no existe
    o si equipos/vp_de/cargo no son válidos.

    `vp_de` se valida contra `equipos`: si se cambia uno sin el otro en la misma
    llamada, se valida contra el `equipos` ya guardado en la fila.
    """
    if equipos is not None:
        equipos = completar_equipos(equipos)
    if vp_de is not None:
        vp_de = sorted(set(vp_de))
    campos = []
    valores: list = []

    # equipos, vp_de y cargo se validan juntos: cambiar uno solo puede dejar el
    # acceso inválido (quitarle el cargo a un board member sin departamento lo
    # dejaría sin acceso a nada), así que se comprueba el trío ya resuelto
    # contra lo que hay guardado.
    if equipos is not None or vp_de is not None or cargo is not None:
        with _get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT preferred_departments, vp_of, role FROM members WHERE id = %s",
                    (acceso_id,),
                )
                fila = cur.fetchone()
        if fila is None:
            return False

        if not _acceso_valido(
            equipos if equipos is not None else fila[0],
            vp_de if vp_de is not None else fila[1],
            cargo if cargo is not None else fila[2],
        ):
            return False

        if equipos is not None:
            campos.append("preferred_departments = %s")
            valores.append(equipos)
        if vp_de is not None:
            campos.append("vp_of = %s")
            valores.append(vp_de)
        if cargo is not None:
            campos.append("role = %s")
            valores.append(cargo)
    if activo is not None:
        campos.append("active = %s")
        valores.append(activo)
    if password:
        # La que pone un admin la conoce un admin: se cambia al entrar.
        campos.append("password_hash = %s")
        valores.append(generate_password_hash(password))
        campos.append("must_change_password = TRUE")
    if nombre is not None:
        campos.append("first_name = %s")
        valores.append(nombre.strip())
    if apellidos is not None:
        campos.append("last_name = %s")
        valores.append(apellidos.strip())
    if dni is not None:
        campos.append("id_document = %s")
        valores.append(dni.strip())
    if email is not None:
        # El email es el login: único (la API traduce el choque a un 400).
        campos.append("email = %s")
        valores.append(email.strip().lower())
    if registro_id is not None:
        # 0 desvincula la cuenta de su inscripción.
        campos.append("registration_id = %s")
        valores.append(registro_id or None)
    if es_admin is not None:
        campos.append("is_admin = %s")
        valores.append(es_admin)
    if foto is not None:
        # Ya validada con `_foto` en la API; "" vuelve a la de `public/`.
        campos.append("photo = %s")
        valores.append(foto)
    if en_web is not None:
        campos.append("on_website = %s")
        valores.append(en_web)
    if linkedin is not None:
        # Ya validado en la API: http(s) o "".
        campos.append("linkedin = %s")
        valores.append(linkedin)

    if not campos:
        return False

    valores.append(acceso_id)
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE members SET {', '.join(campos)} WHERE id = %s",
                valores,
            )
            actualizado = cur.rowcount > 0
        conn.commit()

    return actualizado


def eliminar_equipo_acceso(acceso_id: int) -> bool:
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM members WHERE id = %s", (acceso_id,))
            eliminado = cur.rowcount > 0
        conn.commit()

    return eliminado


# ---------------------------------------------------------------------------
# Calendario compartido: lo gestiona admin, lo ve cualquiera logueado en /equipo.
# ---------------------------------------------------------------------------


def listar_eventos_calendario() -> list[dict]:
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, title, description, date, start_time
                FROM club_events ORDER BY date, start_time
                """
            )
            filas = cur.fetchall()

    return [
        {
            "id": f[0],
            "titulo": f[1],
            "descripcion": f[2],
            "fecha": f[3].isoformat(),
            "hora": f[4],
        }
        for f in filas
    ]


def crear_evento_calendario(titulo: str, descripcion: str, fecha: str, hora: str) -> dict:
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO club_events (title, description, date, start_time)
                VALUES (%s, %s, %s, %s)
                RETURNING id, title, description, date, start_time
                """,
                (titulo.strip(), descripcion.strip(), fecha, hora.strip()),
            )
            fila = cur.fetchone()
        conn.commit()

    return {
        "id": fila[0],
        "titulo": fila[1],
        "descripcion": fila[2],
        "fecha": fila[3].isoformat(),
        "hora": fila[4],
    }


def actualizar_evento_calendario(
    evento_id: int, titulo: str, descripcion: str, fecha: str, hora: str
) -> bool:
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE club_events
                SET title = %s, description = %s, date = %s, start_time = %s
                WHERE id = %s
                """,
                (titulo.strip(), descripcion.strip(), fecha, hora.strip(), evento_id),
            )
            actualizado = cur.rowcount > 0
        conn.commit()

    return actualizado


def eliminar_evento_calendario(evento_id: int) -> bool:
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM club_events WHERE id = %s", (evento_id,))
            eliminado = cur.rowcount > 0
        conn.commit()

    return eliminado


def actualizar_perfil(
    email: str,
    tags: list[str] | None = None,
    notas: str | None = None,
    foto: str | None = None,
) -> bool:
    """Etiquetas de habilidad, nota y foto de una persona.

    Separado de `actualizar_equipo_acceso` a propósito: eso son permisos y solo
    lo toca quien administra; esto es contexto de trabajo y lo edita cualquiera
    del departamento desde su ficha. Mezclarlos habría significado exponer los
    permisos a quien solo quiere apuntar "entrega rápido pero mejor una cosa a
    la vez".
    """
    campos, valores = [], []
    if tags is not None:
        campos.append("tags = %s")
        valores.append(sorted({t.strip() for t in tags if t.strip()}))
    if notas is not None:
        campos.append("notes = %s")
        valores.append(notas.strip())
    if foto is not None:
        # "" borra la foto propia y devuelve a la de `public/`, que es la
        # única forma de deshacer una subida.
        campos.append("photo = %s")
        valores.append(foto)

    if not campos:
        return False

    valores.append(email.strip().lower())
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE members SET {', '.join(campos)} WHERE email = %s",
                valores,
            )
            actualizado = cur.rowcount > 0
        conn.commit()

    return actualizado
