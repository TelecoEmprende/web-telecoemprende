"""Marketing: campañas, contenidos y tareas.

Modelo: Campaign -> Content -> Task. Un Content es una pieza de comunicación
(un reel, un post); una Task es trabajo que hay que hacer. Son cosas distintas
con ciclos de vida distintos, por eso no comparten tabla ni estados.

Los responsables se guardan como TEXT[] de emails, no como tabla intermedia:
es el mismo idioma que ya usa `equipo_accesos.equipos` y ahorra dos joins.
Los emails apuntan a `equipo_accesos.email` pero SIN foreign key a propósito
-- esa tabla es de Hammad y no la tocamos; además así un responsable no
desaparece de una tarea histórica si se le da de baja el acceso.
"""

import json
from datetime import UTC, date, datetime, timedelta

import psycopg2
from psycopg2.extras import RealDictCursor

from backend.config import (
    CONTENT_ESTADOS,
    DATABASE_URL,
    TASK_ESTADOS,
    TASK_PRIORIDADES,
)


def _get_connection():
    return psycopg2.connect(DATABASE_URL)


def init_marketing_db():
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS campaigns (
                    id SERIAL PRIMARY KEY,
                    nombre VARCHAR(160) NOT NULL,
                    objetivo TEXT NOT NULL DEFAULT '',
                    audiencia TEXT NOT NULL DEFAULT '',
                    fecha DATE,
                    creado_por VARCHAR(120) NOT NULL DEFAULT '',
                    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS contents (
                    id SERIAL PRIMARY KEY,
                    campaign_id INTEGER NOT NULL
                        REFERENCES campaigns(id) ON DELETE CASCADE,
                    titulo VARCHAR(160) NOT NULL,
                    tipo VARCHAR(20) NOT NULL DEFAULT '',
                    plataforma VARCHAR(20) NOT NULL DEFAULT '',
                    fecha_publicacion DATE,
                    estado VARCHAR(20) NOT NULL DEFAULT 'idea',
                    script TEXT NOT NULL DEFAULT '',
                    copy_texto TEXT NOT NULL DEFAULT '',
                    cta VARCHAR(200) NOT NULL DEFAULT '',
                    hashtags TEXT NOT NULL DEFAULT '',
                    idea_visual TEXT NOT NULL DEFAULT '',
                    responsables TEXT[] NOT NULL DEFAULT '{}',
                    enlaces TEXT[] NOT NULL DEFAULT '{}',
                    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
                )
            """)
            # `content_id` con ON DELETE CASCADE: borrar un contenido se lleva
            # sus tareas, que no significan nada sin él. `campaign_id` va suelto
            # para permitir tareas de campaña que no cuelgan de ningún contenido
            # ("reservar sala", "pedir presupuesto").
            cur.execute("""
                CREATE TABLE IF NOT EXISTS tasks (
                    id SERIAL PRIMARY KEY,
                    departamento VARCHAR(20) NOT NULL DEFAULT 'marketing',
                    campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
                    content_id INTEGER REFERENCES contents(id) ON DELETE CASCADE,
                    titulo VARCHAR(160) NOT NULL,
                    descripcion TEXT NOT NULL DEFAULT '',
                    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
                    prioridad VARCHAR(10) NOT NULL DEFAULT 'media',
                    deadline DATE,
                    responsables TEXT[] NOT NULL DEFAULT '{}',
                    tags TEXT[] NOT NULL DEFAULT '{}',
                    checklist JSONB NOT NULL DEFAULT '[]',
                    enlaces TEXT[] NOT NULL DEFAULT '{}',
                    creado_por VARCHAR(120) NOT NULL DEFAULT '',
                    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
                )
            """)
            cur.execute(
                "CREATE INDEX IF NOT EXISTS contents_campaign_idx ON contents (campaign_id)"
            )
            cur.execute(
                "CREATE INDEX IF NOT EXISTS tasks_content_idx ON tasks (content_id)"
            )
            cur.execute(
                "CREATE INDEX IF NOT EXISTS tasks_campaign_idx ON tasks (campaign_id)"
            )
        conn.commit()


def _serializar(fila: dict) -> dict:
    """Las fechas de psycopg2 vienen como date/datetime; el JSON las quiere en ISO."""
    salida = dict(fila)
    for clave, valor in salida.items():
        if hasattr(valor, "isoformat"):
            salida[clave] = valor.isoformat()
    return salida


# --------------------------------------------------------------------------
# Campaigns
# --------------------------------------------------------------------------

def listar_campaigns() -> list[dict]:
    with _get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT c.*,
                       (SELECT COUNT(*) FROM contents co WHERE co.campaign_id = c.id)
                           AS total_contents,
                       (SELECT COUNT(*) FROM tasks t WHERE t.campaign_id = c.id)
                           AS total_tasks
                FROM campaigns c
                ORDER BY COALESCE(c.fecha, c.created_at::date) DESC, c.id DESC
            """)
            return [_serializar(f) for f in cur.fetchall()]


def obtener_campaign(campaign_id: int) -> dict | None:
    """Campaña con sus contenidos anidados, y las tareas dentro de cada contenido."""
    with _get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM campaigns WHERE id = %s", (campaign_id,))
            campaign = cur.fetchone()
            if campaign is None:
                return None

            cur.execute(
                "SELECT * FROM contents WHERE campaign_id = %s"
                " ORDER BY COALESCE(fecha_publicacion, '9999-12-31'::date), id",
                (campaign_id,),
            )
            contents = [_serializar(f) for f in cur.fetchall()]

            cur.execute(
                "SELECT * FROM tasks WHERE campaign_id = %s ORDER BY id",
                (campaign_id,),
            )
            tasks = [_serializar(f) for f in cur.fetchall()]

    por_content: dict[int, list] = {}
    sueltas = []
    for tarea in tasks:
        if tarea["content_id"] is None:
            sueltas.append(tarea)
        else:
            por_content.setdefault(tarea["content_id"], []).append(tarea)

    for content in contents:
        content["tasks"] = por_content.get(content["id"], [])

    campaign = _serializar(campaign)
    campaign["contents"] = contents
    campaign["tasks_sueltas"] = sueltas
    return campaign


def crear_campaign(
    nombre: str,
    objetivo: str,
    audiencia: str,
    fecha: date | None,
    creado_por: str,
) -> dict:
    with _get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO campaigns (nombre, objetivo, audiencia, fecha, creado_por)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING *
                """,
                (nombre, objetivo, audiencia, fecha, creado_por),
            )
            fila = cur.fetchone()
        conn.commit()
    return _serializar(fila)


def actualizar_campaign(campaign_id: int, **campos) -> bool:
    permitidos = ("nombre", "objetivo", "audiencia", "fecha")
    return _actualizar("campaigns", campaign_id, permitidos, campos)


def eliminar_campaign(campaign_id: int) -> bool:
    """El ON DELETE CASCADE se lleva contenidos y tareas por delante."""
    return _eliminar("campaigns", campaign_id)


# --------------------------------------------------------------------------
# Contents
# --------------------------------------------------------------------------

def crear_content(campaign_id: int, **campos) -> dict | None:
    with _get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT 1 FROM campaigns WHERE id = %s", (campaign_id,))
            if cur.fetchone() is None:
                return None

            cur.execute(
                """
                INSERT INTO contents (
                    campaign_id, titulo, tipo, plataforma, fecha_publicacion,
                    estado, script, copy_texto, cta, hashtags, idea_visual,
                    responsables, enlaces
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
                """,
                (
                    campaign_id,
                    campos.get("titulo", ""),
                    campos.get("tipo", ""),
                    campos.get("plataforma", ""),
                    campos.get("fecha_publicacion"),
                    campos.get("estado", "idea"),
                    campos.get("script", ""),
                    campos.get("copy_texto", ""),
                    campos.get("cta", ""),
                    campos.get("hashtags", ""),
                    campos.get("idea_visual", ""),
                    campos.get("responsables", []),
                    campos.get("enlaces", []),
                ),
            )
            fila = cur.fetchone()
        conn.commit()

    content = _serializar(fila)
    content["tasks"] = []
    return content


def obtener_content(content_id: int) -> dict | None:
    with _get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM contents WHERE id = %s", (content_id,))
            fila = cur.fetchone()
            if fila is None:
                return None

            cur.execute(
                "SELECT * FROM tasks WHERE content_id = %s ORDER BY id", (content_id,)
            )
            tasks = [_serializar(t) for t in cur.fetchall()]

    content = _serializar(fila)
    content["tasks"] = tasks
    return content


def actualizar_content(content_id: int, **campos) -> bool:
    permitidos = (
        "titulo", "tipo", "plataforma", "fecha_publicacion", "estado", "script",
        "copy_texto", "cta", "hashtags", "idea_visual", "responsables", "enlaces",
    )
    return _actualizar("contents", content_id, permitidos, campos)


def eliminar_content(content_id: int) -> bool:
    return _eliminar("contents", content_id)


# --------------------------------------------------------------------------
# Tasks
# --------------------------------------------------------------------------

def listar_tasks(departamento: str = "marketing") -> list[dict]:
    """Incluye el nombre del contenido/campaña de cada tarea.

    Sin esto el tablero enseña cuatro filas llamadas "Guion" y tres llamadas
    "Revisión" sin decir de qué son, y quien lo mira tiene que reconstruir de
    memoria a qué reel pertenece cada una.
    """
    with _get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT t.*,
                       co.titulo AS content_titulo,
                       c.nombre AS campaign_nombre
                FROM tasks t
                LEFT JOIN contents co ON co.id = t.content_id
                LEFT JOIN campaigns c ON c.id = t.campaign_id
                WHERE t.departamento = %s
                ORDER BY COALESCE(t.deadline, '9999-12-31'::date), t.id
                """,
                (departamento,),
            )
            return [_serializar(f) for f in cur.fetchall()]


def obtener_task(task_id: int) -> dict | None:
    with _get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM tasks WHERE id = %s", (task_id,))
            fila = cur.fetchone()
    return _serializar(fila) if fila is not None else None


def crear_task(**campos) -> dict | None:
    campaign_id = campos.get("campaign_id")
    content_id = campos.get("content_id")

    with _get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Un content_id manda: la tarea hereda la campaña de su contenido,
            # así no puede quedar colgando de una campaña distinta a la suya.
            if content_id is not None:
                cur.execute(
                    "SELECT campaign_id FROM contents WHERE id = %s", (content_id,)
                )
                fila = cur.fetchone()
                if fila is None:
                    return None
                campaign_id = fila["campaign_id"]
            elif campaign_id is not None:
                cur.execute("SELECT 1 FROM campaigns WHERE id = %s", (campaign_id,))
                if cur.fetchone() is None:
                    return None

            cur.execute(
                """
                INSERT INTO tasks (
                    departamento, campaign_id, content_id, titulo, descripcion,
                    estado, prioridad, deadline, responsables, tags, checklist,
                    enlaces, creado_por
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
                """,
                (
                    campos.get("departamento", "marketing"),
                    campaign_id,
                    content_id,
                    campos.get("titulo", ""),
                    campos.get("descripcion", ""),
                    campos.get("estado", "pendiente"),
                    campos.get("prioridad", "media"),
                    campos.get("deadline"),
                    campos.get("responsables", []),
                    campos.get("tags", []),
                    json.dumps(campos.get("checklist", [])),
                    campos.get("enlaces", []),
                    campos.get("creado_por", ""),
                ),
            )
            nueva = cur.fetchone()
        conn.commit()
    return _serializar(nueva)


def actualizar_task(task_id: int, **campos) -> bool:
    permitidos = (
        "titulo", "descripcion", "estado", "prioridad", "deadline",
        "responsables", "tags", "checklist", "enlaces",
    )
    if "checklist" in campos:
        campos = dict(campos, checklist=json.dumps(campos["checklist"]))
    return _actualizar("tasks", task_id, permitidos, campos)


def eliminar_task(task_id: int) -> bool:
    return _eliminar("tasks", task_id)


# --------------------------------------------------------------------------
# Calendario
# --------------------------------------------------------------------------

def calendario(desde: date, hasta: date) -> list[dict]:
    """Vista de solo lectura sobre lo que ya existe: no hay tabla de calendario.

    Devuelve deadlines de tareas y fechas de publicación de contenidos en el
    rango pedido, ya normalizados a la misma forma para que el frontend pinte
    una única lista sin distinguir de dónde sale cada cosa.
    """
    with _get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT * FROM (
                    SELECT 'content' AS origen, co.id, co.titulo,
                           co.fecha_publicacion AS fecha, co.estado,
                           co.campaign_id, co.plataforma AS detalle,
                           NULL AS prioridad, c.nombre AS padre,
                           co.responsables
                    FROM contents co
                    JOIN campaigns c ON c.id = co.campaign_id
                    WHERE co.fecha_publicacion BETWEEN %(desde)s AND %(hasta)s
                    UNION ALL
                    SELECT 'task' AS origen, t.id, t.titulo,
                           t.deadline AS fecha, t.estado,
                           t.campaign_id, t.prioridad AS detalle,
                           t.prioridad, COALESCE(co.titulo, c.nombre) AS padre,
                           t.responsables
                    FROM tasks t
                    LEFT JOIN contents co ON co.id = t.content_id
                    LEFT JOIN campaigns c ON c.id = t.campaign_id
                    WHERE t.deadline BETWEEN %(desde)s AND %(hasta)s
                ) x
                ORDER BY fecha,
                         -- La publicación ancla el día; después las tareas por
                         -- urgencia. Alfabético dejaba lo urgente escondido en
                         -- medio de la lista.
                         CASE prioridad
                             WHEN 'alta' THEN 1 WHEN 'media' THEN 2
                             WHEN 'baja' THEN 3 ELSE 0
                         END,
                         titulo
                """,
                {"desde": desde, "hasta": hasta},
            )
            return [_serializar(f) for f in cur.fetchall()]


def calendario_ics(desde: date, hasta: date) -> str:
    """El mismo contenido de `calendario()` en formato .ics, para que alguien
    lo suscriba en Google Calendar (o el que use) y lo vea sin entrar aquí.

    Sin librería aparte: un evento de día completo en RFC 5545 son unas
    pocas líneas de texto plano.
    """
    lineas = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//TelecoEmprende//Marketing//ES",
        "CALSCALE:GREGORIAN",
        # Pide a los clientes que no lo den de baja tras un rato sin cambios
        # ni lo repinten cada minuto; una vez al día de sobra para deadlines.
        "X-PUBLISHED-TTL:PT24H",
    ]
    for item in calendario(desde, hasta):
        inicio = date.fromisoformat(item["fecha"])
        etiqueta = "Tarea" if item["origen"] == "task" else "Publicación"
        resumen = _ics_escapar(f"{etiqueta}: {item['titulo']}")
        descripcion = " · ".join(p for p in (item.get("padre"), item.get("detalle")) if p)
        lineas += ["BEGIN:VEVENT", f"UID:marketing-{item['origen']}-{item['id']}@telecoemprende.es"]
        lineas.append(f"DTSTAMP:{datetime.now(UTC).strftime('%Y%m%dT%H%M%SZ')}")
        lineas.append(f"DTSTART;VALUE=DATE:{inicio.strftime('%Y%m%d')}")
        lineas.append(f"DTEND;VALUE=DATE:{(inicio + timedelta(days=1)).strftime('%Y%m%d')}")
        lineas.append(f"SUMMARY:{resumen}")
        if descripcion:
            lineas.append(f"DESCRIPTION:{_ics_escapar(descripcion)}")
        lineas.append("END:VEVENT")
    lineas.append("END:VCALENDAR")
    return "\r\n".join(lineas) + "\r\n"


def _ics_escapar(texto: str) -> str:
    return texto.replace("\\", "\\\\").replace(",", "\\,").replace(";", "\\;").replace("\n", "\\n")


# --------------------------------------------------------------------------
# Helpers compartidos
# --------------------------------------------------------------------------

def _actualizar(tabla: str, fila_id: int, permitidos: tuple, campos: dict) -> bool:
    """UPDATE parcial: solo toca las claves presentes en `campos`.

    `tabla` y `permitidos` son literales del código, nunca entrada de usuario:
    las claves que no estén en `permitidos` se descartan antes de construir el
    SQL, así que la interpolación del nombre de columna no es inyectable.
    """
    asignaciones = []
    valores: list = []
    for clave in permitidos:
        if clave in campos:
            asignaciones.append(f"{clave} = %s")
            valores.append(campos[clave])

    if not asignaciones:
        return False

    asignaciones.append("updated_at = NOW()")
    valores.append(fila_id)

    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE {tabla} SET {', '.join(asignaciones)} WHERE id = %s",
                valores,
            )
            actualizado = cur.rowcount > 0
        conn.commit()
    return actualizado


def _eliminar(tabla: str, fila_id: int) -> bool:
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(f"DELETE FROM {tabla} WHERE id = %s", (fila_id,))
            eliminado = cur.rowcount > 0
        conn.commit()
    return eliminado


# Validadores usados por la capa API. Viven aquí para que las reglas de estado
# estén junto al modelo que las guarda, no repartidas por las rutas.
def estado_task_valido(estado: str) -> bool:
    return estado in TASK_ESTADOS


def estado_content_valido(estado: str) -> bool:
    return estado in CONTENT_ESTADOS


def prioridad_valida(prioridad: str) -> bool:
    return prioridad in TASK_PRIORIDADES
