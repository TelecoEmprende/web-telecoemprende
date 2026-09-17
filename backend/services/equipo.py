from io import BytesIO

import psycopg2
from fpdf import FPDF
from flask import session
from psycopg2.extras import Json
from werkzeug.security import check_password_hash, generate_password_hash

from backend.config import (
    CARGOS_VALIDOS,
    DATABASE_URL,
    EQUIPO_CON_PERMISOS_ADMIN,
    EQUIPOS_VALIDOS,
)

# Hash "de relleno" para cuando el email no existe: sin esto, saltarse
# check_password_hash en ese caso haría que la respuesta fuera más rápida
# para emails no registrados, filtrando por tiempo qué correos están de alta.
_DUMMY_HASH = generate_password_hash("no-existe-ningun-usuario-con-este-email")


def _get_connection():
    return psycopg2.connect(DATABASE_URL)


def init_equipo_db():
    # Mismo motivo que en `init_marketing_db`/`init_registros_db`: se llama en
    # cada petición y puede correr en paralelo con ella misma sobre una base
    # de datos recién estrenada, donde `CREATE TABLE IF NOT EXISTS` no es
    # atómico entre transacciones concurrentes.
    try:
        _crear_tablas_equipo()
    except psycopg2.errors.UniqueViolation:
        pass


def _crear_tablas_equipo():
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS equipo_accesos (
                    id SERIAL PRIMARY KEY,
                    email VARCHAR(120) NOT NULL UNIQUE,
                    password_hash VARCHAR(255) NOT NULL,
                    equipos TEXT[] NOT NULL DEFAULT '{}',
                    activo BOOLEAN NOT NULL DEFAULT TRUE,
                    created_at TIMESTAMP NOT NULL DEFAULT NOW()
                )
            """)
            # vp_de: subconjunto de `equipos` donde la persona es VP (gestiona
            # el dashboard de ese equipo). cargo: 'presidente'/'boardmember'/''
            # (dirección, independiente del departamento).
            cur.execute("""
                ALTER TABLE equipo_accesos
                ADD COLUMN IF NOT EXISTS vp_de TEXT[] NOT NULL DEFAULT '{}'
            """)
            cur.execute("""
                ALTER TABLE equipo_accesos
                ADD COLUMN IF NOT EXISTS cargo VARCHAR(20) NOT NULL DEFAULT ''
            """)
            # Perfil de la persona, no del departamento: por eso vive aquí y no
            # en una tabla de Marketing. Eventos e Ingeniería leen lo mismo sin
            # volver a construirlo (era la decisión abierta de
            # docs/propuesta-crm-miembros.md, resuelta por la opción B).
            cur.execute("""
                ALTER TABLE equipo_accesos
                ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}'
            """)
            cur.execute("""
                ALTER TABLE equipo_accesos
                ADD COLUMN IF NOT EXISTS notas TEXT NOT NULL DEFAULT ''
            """)
            # Nombre para mostrar: sin él, cada avatar/etiqueta de la app
            # adivinaba el nombre a partir del email (ver Avatares.tsx).
            cur.execute("""
                ALTER TABLE equipo_accesos
                ADD COLUMN IF NOT EXISTS nombre VARCHAR(80) NOT NULL DEFAULT ''
            """)
            # Checklist de onboarding, `{"clave": true/false}`. El backend no
            # conoce las claves -- son copy de UI, viven en el frontend -- así
            # que se guarda tal cual llega, sin validar su forma interna.
            cur.execute("""
                ALTER TABLE equipo_accesos
                ADD COLUMN IF NOT EXISTS onboarding JSONB NOT NULL DEFAULT '{}'::jsonb
            """)
            # DNI/NIE/pasaporte y correo personal: los rellena admin a mano
            # (no forman parte del alta ni del login), para tener con qué
            # identificar a la persona una vez pierda el correo de la UPM.
            cur.execute("""
                ALTER TABLE equipo_accesos
                ADD COLUMN IF NOT EXISTS dni VARCHAR(20) NOT NULL DEFAULT ''
            """)
            cur.execute("""
                ALTER TABLE equipo_accesos
                ADD COLUMN IF NOT EXISTS correo_personal VARCHAR(120) NOT NULL DEFAULT ''
            """)
            # Mentor de un nuevo miembro: email de otro acceso, sin FK por el
            # mismo motivo que `responsables` en tasks (ver marketing.py) --
            # así la ficha de alguien no se rompe si a su mentor se le da de
            # baja el acceso. Lo asigna admin (ver `EquipoAccesosPanel`), no
            # el propio departamento (`actualizar_perfil`).
            # Foto de perfil propia, como data URL (`data:image/jpeg;base64,...`).
            # Va en la fila y no en un blob store porque la imagen llega ya
            # reducida a 256px desde el navegador (~15 KB) y la CSP del sitio
            # ya permite `data:` en img-src -- montar almacenamiento aparte
            # para eso sería más infraestructura que foto. Vacía = se usa la
            # que hay en `public/equipo-*.jpg` (ver `Avatares.tsx`).
            cur.execute("""
                ALTER TABLE equipo_accesos
                ADD COLUMN IF NOT EXISTS foto TEXT NOT NULL DEFAULT ''
            """)
            cur.execute("""
                ALTER TABLE equipo_accesos
                ADD COLUMN IF NOT EXISTS mentor_email VARCHAR(120) NOT NULL DEFAULT ''
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS calendario_eventos (
                    id SERIAL PRIMARY KEY,
                    titulo VARCHAR(150) NOT NULL,
                    descripcion VARCHAR(500) NOT NULL DEFAULT '',
                    fecha DATE NOT NULL,
                    hora VARCHAR(5) NOT NULL DEFAULT '',
                    created_at TIMESTAMP NOT NULL DEFAULT NOW()
                )
            """)
            # Confirmación previa ("Voy") y check-in real el día del evento --
            # dos listas de email porque son dos hechos distintos (ver
            # `metricas_club`: la asistencia real es la que alimenta la
            # métrica, no quien dijo que iba a venir).
            cur.execute("""
                ALTER TABLE calendario_eventos
                ADD COLUMN IF NOT EXISTS confirmados TEXT[] NOT NULL DEFAULT '{}'
            """)
            cur.execute("""
                ALTER TABLE calendario_eventos
                ADD COLUMN IF NOT EXISTS asistio TEXT[] NOT NULL DEFAULT '{}'
            """)
        conn.commit()


def listar_directorio_club() -> list[dict]:
    """Quién es quién del club entero, para el widget de "Mi semana" -- solo
    lo básico (nombre, equipos, cargo, mentor). Nada de notas ni onboarding,
    que son privados (ver `listar_equipo_accesos`, la versión completa de
    /admin). El mentor sí viaja aquí: no es un dato privado y es lo que deja
    a "Mi semana" enseñar "Mi mentora" y "Tutoriza a" sin una ruta aparte.
    """
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT email, equipos, vp_de, cargo, nombre, mentor_email
                FROM equipo_accesos WHERE activo = TRUE ORDER BY nombre, email
                """
            )
            filas = cur.fetchall()

    return [
        {
            "email": f[0], "equipos": f[1], "vp_de": f[2], "cargo": f[3],
            "nombre": f[4], "mentor_email": f[5],
        }
        for f in filas
    ]


def _tiene_permisos_admin(equipos: list[str], cargo: str) -> bool:
    return EQUIPO_CON_PERMISOS_ADMIN in equipos or cargo in CARGOS_VALIDOS


def login_equipo(email: str, password: str) -> dict | None:
    email = email.strip().lower()
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT password_hash, equipos, vp_de, cargo, nombre, mentor_email
                FROM equipo_accesos WHERE email = %s AND activo = TRUE
                """,
                (email,),
            )
            row = cur.fetchone()

    password_hash = row[0] if row is not None else _DUMMY_HASH
    password_ok = check_password_hash(password_hash, password)

    if row is None or not password_ok:
        return None

    equipos = [e for e in row[1] if e in EQUIPOS_VALIDOS]
    vp_de = [e for e in row[2] if e in equipos]
    cargo = row[3] if row[3] in CARGOS_VALIDOS else ""
    nombre = row[4]
    mentor_email = row[5]

    # session.clear() por higiene ante fijación de sesión (mismo criterio que
    # login_admin).
    session.clear()
    session.permanent = True
    session["equipo_email"] = email
    session["equipo_teams"] = equipos
    session["equipo_vp_de"] = vp_de
    session["equipo_cargo"] = cargo
    session["equipo_nombre"] = nombre
    session["equipo_mentor_email"] = mentor_email
    # Ingeniería, presidencia y board reciben también sesión de /admin:
    # reutiliza la misma clave de sesión que usa login_admin, así
    # is_admin_authenticated() funciona igual venga de /admin o de /equipo.
    if _tiene_permisos_admin(equipos, cargo):
        session["admin_auth"] = True
    return {
        "teams": equipos, "vp_de": vp_de, "cargo": cargo, "nombre": nombre,
        "mentor_email": mentor_email,
    }


def is_equipo_authenticated() -> bool:
    return "equipo_email" in session


def equipo_session_info() -> dict:
    return {
        "teams": session.get("equipo_teams", []),
        "vp_de": session.get("equipo_vp_de", []),
        "cargo": session.get("equipo_cargo", ""),
        "email": session.get("equipo_email", ""),
        "nombre": session.get("equipo_nombre", ""),
        "mentor_email": session.get("equipo_mentor_email", ""),
    }


def logout_equipo() -> None:
    session.clear()



def listar_equipo_accesos() -> list[dict]:
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, email, equipos, vp_de, cargo, activo, created_at,
                       tags, notas, nombre, onboarding, dni, correo_personal,
                       mentor_email, foto
                FROM equipo_accesos ORDER BY email
                """
            )
            filas = cur.fetchall()

    return [
        {
            "id": f[0],
            "email": f[1],
            "equipos": f[2],
            "vp_de": f[3],
            "cargo": f[4],
            "activo": f[5],
            "created_at": f[6].isoformat(),
            "tags": f[7],
            "notas": f[8],
            "nombre": f[9],
            "onboarding": f[10],
            "dni": f[11],
            "correo_personal": f[12],
            "mentor_email": f[13],
            "foto": f[14],
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
        ("Nombre", 40), ("Email", 55), ("DNI", 25), ("Correo personal", 55),
        ("Equipos", 45), ("Cargo", 25), ("Activo", 15),
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
            acceso["correo_personal"] or "-",
            ", ".join(acceso["equipos"]) or "-",
            acceso["cargo"] or "-",
            "Sí" if acceso["activo"] else "No",
        ]
        for (_, ancho), valor in zip(columnas, valores):
            texto = valor.encode("latin-1", "replace").decode("latin-1")
            pdf.cell(ancho, 7, texto, border=1)
        pdf.ln()

    return BytesIO(bytes(pdf.output()))


def miembros_activos(equipo: str) -> list[dict]:
    """Los accesos activos de un departamento -- filtro que reutilizan el
    directorio de marketing (`api_miembros`) y `salud_equipo`, para no tener
    la misma condición escrita dos veces."""
    return [a for a in listar_equipo_accesos() if equipo in a["equipos"] and a["activo"]]


def _acceso_valido(equipos: list[str], vp_de: list[str], cargo: str) -> bool:
    """Un acceso necesita al menos un departamento O un cargo de dirección.

    El cargo a solas (board member sin departamento) es válido a propósito: ya
    da sesión de /admin por sí mismo (ver `_tiene_permisos_admin`), que es
    justo el caso de quien está en el board pero no en ningún equipo. Sin
    ninguno de los dos, en cambio, la cuenta no daría acceso a nada.
    """
    if cargo and cargo not in CARGOS_VALIDOS:
        return False
    if any(e not in EQUIPOS_VALIDOS for e in equipos):
        return False
    if not equipos and not cargo:
        return False
    return all(v in equipos for v in vp_de)


def crear_equipo_acceso(
    email: str,
    password: str,
    equipos: list[str],
    vp_de: list[str] | None = None,
    cargo: str = "",
    nombre: str = "",
    mentor_email: str = "",
) -> dict | None:
    """Devuelve None si el email ya existe o si equipos/vp_de/cargo no son válidos."""
    email = email.strip().lower()
    equipos = sorted(set(equipos))
    vp_de = sorted(set(vp_de or []))
    cargo = cargo or ""
    nombre = (nombre or "").strip()
    mentor_email = (mentor_email or "").strip().lower()

    if not _acceso_valido(equipos, vp_de, cargo):
        return None

    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM equipo_accesos WHERE email = %s", (email,))
            if cur.fetchone() is not None:
                return None

            cur.execute(
                """
                INSERT INTO equipo_accesos
                    (email, password_hash, equipos, vp_de, cargo, nombre, mentor_email)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id, email, equipos, vp_de, cargo, activo, created_at, nombre, mentor_email
                """,
                (email, generate_password_hash(password), equipos, vp_de, cargo, nombre, mentor_email),
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
        "mentor_email": fila[8],
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
                """
                INSERT INTO equipo_accesos (email, password_hash, activo)
                VALUES (%s, %s, FALSE)
                ON CONFLICT (email) DO NOTHING
                """,
                (email.strip().lower(), generate_password_hash(password)),
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
    dni: str | None = None,
    correo_personal: str | None = None,
    mentor_email: str | None = None,
) -> bool:
    """Actualiza solo los campos que se pasan. Devuelve False si el id no existe
    o si equipos/vp_de/cargo no son válidos.

    `vp_de` se valida contra `equipos`: si se cambia uno sin el otro en la misma
    llamada, se valida contra el `equipos` ya guardado en la fila.
    """
    if equipos is not None:
        equipos = sorted(set(equipos))
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
                    "SELECT equipos, vp_de, cargo FROM equipo_accesos WHERE id = %s",
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
            campos.append("equipos = %s")
            valores.append(equipos)
        if vp_de is not None:
            campos.append("vp_de = %s")
            valores.append(vp_de)
        if cargo is not None:
            campos.append("cargo = %s")
            valores.append(cargo)
    if activo is not None:
        campos.append("activo = %s")
        valores.append(activo)
    if password:
        campos.append("password_hash = %s")
        valores.append(generate_password_hash(password))
    if nombre is not None:
        campos.append("nombre = %s")
        valores.append(nombre.strip())
    if dni is not None:
        campos.append("dni = %s")
        valores.append(dni.strip())
    if correo_personal is not None:
        campos.append("correo_personal = %s")
        valores.append(correo_personal.strip().lower())
    if mentor_email is not None:
        campos.append("mentor_email = %s")
        valores.append(mentor_email.strip().lower())

    if not campos:
        return False

    valores.append(acceso_id)
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE equipo_accesos SET {', '.join(campos)} WHERE id = %s",
                valores,
            )
            actualizado = cur.rowcount > 0
        conn.commit()

    return actualizado


def eliminar_equipo_acceso(acceso_id: int) -> bool:
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM equipo_accesos WHERE id = %s", (acceso_id,))
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
                SELECT id, titulo, descripcion, fecha, hora, confirmados, asistio
                FROM calendario_eventos ORDER BY fecha, hora
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
            "confirmados": f[5],
            "asistio": f[6],
        }
        for f in filas
    ]


def confirmar_evento_calendario(evento_id: int, email: str, confirmar: bool) -> bool:
    """"Voy" / "no voy" de la propia persona a un evento del club. Un TEXT[]
    con array_append/array_remove en vez de una tabla de asistencia aparte:
    es la misma cardinalidad que `reuniones.asistentes`, que ya vive así."""
    email = email.strip().lower()
    operacion = "array_append" if confirmar else "array_remove"
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE calendario_eventos
                SET confirmados = {operacion}(array_remove(confirmados, %s), %s)
                WHERE id = %s
                """
                if confirmar
                else f"""
                UPDATE calendario_eventos SET confirmados = {operacion}(confirmados, %s)
                WHERE id = %s
                """,
                (email, email, evento_id) if confirmar else (email, evento_id),
            )
            actualizado = cur.rowcount > 0
        conn.commit()
    return actualizado


def marcar_asistio_evento(evento_id: int, email: str, asistio: bool) -> bool:
    """Check-in real el día del evento -- lo marca quien gestiona la puerta
    (VP/admin, ver `_puede_editar_calendario_club`), no la propia persona.
    Alimenta `metricas_club` ("asistencia media"), a diferencia de
    `confirmados`, que es solo la intención previa."""
    email = email.strip().lower()
    operacion = "array_append" if asistio else "array_remove"
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE calendario_eventos
                SET asistio = {operacion}(array_remove(asistio, %s), %s)
                WHERE id = %s
                """
                if asistio
                else f"""
                UPDATE calendario_eventos SET asistio = {operacion}(asistio, %s)
                WHERE id = %s
                """,
                (email, email, evento_id) if asistio else (email, evento_id),
            )
            actualizado = cur.rowcount > 0
        conn.commit()
    return actualizado




def crear_evento_calendario(titulo: str, descripcion: str, fecha: str, hora: str) -> dict:
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO calendario_eventos (titulo, descripcion, fecha, hora)
                VALUES (%s, %s, %s, %s)
                RETURNING id, titulo, descripcion, fecha, hora
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
                UPDATE calendario_eventos
                SET titulo = %s, descripcion = %s, fecha = %s, hora = %s
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
            cur.execute("DELETE FROM calendario_eventos WHERE id = %s", (evento_id,))
            eliminado = cur.rowcount > 0
        conn.commit()

    return eliminado


def actualizar_perfil(
    email: str,
    tags: list[str] | None = None,
    notas: str | None = None,
    onboarding: dict | None = None,
    foto: str | None = None,
) -> bool:
    """Etiquetas de habilidad, nota y checklist de onboarding de una persona.

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
        campos.append("notas = %s")
        valores.append(notas.strip())
    if onboarding is not None:
        # Reemplazo completo, igual que tags/notas: el frontend siempre manda
        # el objeto entero, no un parche.
        campos.append("onboarding = %s")
        valores.append(Json(onboarding))
    if foto is not None:
        # "" borra la foto propia y devuelve a la de `public/`, que es la
        # única forma de deshacer una subida.
        campos.append("foto = %s")
        valores.append(foto)

    if not campos:
        return False

    valores.append(email.strip().lower())
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE equipo_accesos SET {', '.join(campos)} WHERE email = %s",
                valores,
            )
            actualizado = cur.rowcount > 0
        conn.commit()

    return actualizado
