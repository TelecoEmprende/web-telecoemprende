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
from datetime import date

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
    # Se llama en cada petición a marketing_api (ver `requiere_equipo`), así
    # que puede correr en paralelo con ella misma sobre una base de datos
    # recién estrenada -- el primer `Promise.all` de un departamento nuevo
    # dispara varias a la vez. `CREATE TABLE IF NOT EXISTS` no es atómico
    # entre transacciones: si dos llegan a crearla a la vez, la segunda
    # revienta contra el catálogo de Postgres (UniqueViolation en pg_type) en
    # vez de encontrarla ya creada. Si pasa, es que la otra ya la ha creado.
    try:
        _crear_tablas_marketing()
    except psycopg2.errors.UniqueViolation:
        pass


def _crear_tablas_marketing():
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
            # Las campañas son de un departamento, igual que las tareas. Sin
            # esta columna, montar el mismo tablero para Eventos le enseñaría
            # las campañas de Marketing. Default 'marketing' porque todas las
            # que existían cuando se añadió eran de Marketing.
            cur.execute("""
                ALTER TABLE campaigns
                ADD COLUMN IF NOT EXISTS departamento VARCHAR(20)
                    NOT NULL DEFAULT 'marketing'
            """)
            # Hora opcional: mismo formato "HH:MM" y misma columna que
            # `reuniones`, sin la cual una tarea con hora real no se puede
            # distinguir de una que solo tiene fecha límite.
            cur.execute("""
                ALTER TABLE tasks
                ADD COLUMN IF NOT EXISTS hora VARCHAR(5) NOT NULL DEFAULT ''
            """)
            # Archivar en vez de borrar: una campaña vieja deja de estorbar en
            # el listado sin perder su historial (contenidos, tareas, enlaces).
            cur.execute("""
                ALTER TABLE campaigns
                ADD COLUMN IF NOT EXISTS archivado BOOLEAN NOT NULL DEFAULT FALSE
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
            # Conversación de una tarea. `ON DELETE CASCADE`: sin la tarea, sus
            # comentarios no significan nada (mismo criterio que `contents`).
            cur.execute("""
                CREATE TABLE IF NOT EXISTS task_comments (
                    id SERIAL PRIMARY KEY,
                    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
                    autor VARCHAR(120) NOT NULL DEFAULT '',
                    texto TEXT NOT NULL,
                    created_at TIMESTAMP NOT NULL DEFAULT NOW()
                )
            """)
            cur.execute(
                "CREATE INDEX IF NOT EXISTS task_comments_task_idx ON task_comments (task_id)"
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

def listar_campaigns(departamento: str) -> list[dict]:
    with _get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT c.*,
                       (SELECT COUNT(*) FROM contents co WHERE co.campaign_id = c.id)
                           AS total_contents,
                       (SELECT COUNT(*) FROM tasks t WHERE t.campaign_id = c.id)
                           AS total_tasks
                FROM campaigns c
                WHERE c.departamento = %s
                ORDER BY COALESCE(c.fecha, c.created_at::date) DESC, c.id DESC
            """, (departamento,))
            return [_serializar(f) for f in cur.fetchall()]


def obtener_campaign(campaign_id: int, departamento: str) -> dict | None:
    """Campaña con sus contenidos anidados, y las tareas dentro de cada contenido."""
    with _get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM campaigns WHERE id = %s AND departamento = %s",
                (campaign_id, departamento),
            )
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
    departamento: str,
) -> dict:
    with _get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO campaigns
                    (nombre, objetivo, audiencia, fecha, creado_por, departamento)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING *
                """,
                (nombre, objetivo, audiencia, fecha, creado_por, departamento),
            )
            fila = cur.fetchone()
        conn.commit()
    return _serializar(fila)


def actualizar_campaign(campaign_id: int, departamento: str, **campos) -> bool:
    permitidos = ("nombre", "objetivo", "audiencia", "fecha", "archivado")
    return _actualizar("campaigns", campaign_id, permitidos, campos, departamento)


def eliminar_campaign(campaign_id: int, departamento: str) -> bool:
    """El ON DELETE CASCADE se lleva contenidos y tareas por delante."""
    return _eliminar("campaigns", campaign_id, departamento)


def duplicar_campaign(campaign_id: int, departamento: str, creado_por: str) -> dict | None:
    """Copia una campaña entera -- contenidos y tareas incluidos -- para lo
    que se repite (reunión semanal, story de bienvenida) sin rehacerla a
    mano cada vez.

    La copia sale "en blanco": sin fecha, sin publicar, con las tareas en
    `pendiente` y la checklist sin marcar. El texto (guion, copy, hashtags,
    el propio enunciado de cada tarea) sí se conserva -- es la plantilla que
    se quiere reutilizar, no el estado de la última vez.
    """
    original = obtener_campaign(campaign_id, departamento)
    if original is None:
        return None

    nueva = crear_campaign(
        nombre=f"{original['nombre']} (copia)",
        objetivo=original["objetivo"],
        audiencia=original["audiencia"],
        fecha=None,
        creado_por=creado_por,
        departamento=departamento,
    )

    def _tarea_en_blanco(tarea: dict) -> dict:
        return {
            "titulo": tarea["titulo"],
            "descripcion": tarea["descripcion"],
            "estado": "pendiente",
            "prioridad": tarea["prioridad"],
            "deadline": None,
            "responsables": tarea["responsables"],
            "tags": tarea["tags"],
            "checklist": [{**item, "hecho": False} for item in tarea["checklist"]],
            "enlaces": tarea["enlaces"],
            "creado_por": creado_por,
        }

    for content in original["contents"]:
        nuevo_content = crear_content(
            nueva["id"],
            departamento,
            titulo=content["titulo"],
            tipo=content["tipo"],
            plataforma=content["plataforma"],
            fecha_publicacion=None,
            estado="idea",
            script=content["script"],
            copy_texto=content["copy_texto"],
            cta=content["cta"],
            hashtags=content["hashtags"],
            idea_visual=content["idea_visual"],
            responsables=content["responsables"],
            enlaces=content["enlaces"],
        )
        for tarea in content["tasks"]:
            crear_task(
                departamento=departamento,
                content_id=nuevo_content["id"],
                **_tarea_en_blanco(tarea),
            )

    for tarea in original["tasks_sueltas"]:
        crear_task(
            departamento=departamento,
            campaign_id=nueva["id"],
            **_tarea_en_blanco(tarea),
        )

    return obtener_campaign(nueva["id"], departamento)


# --------------------------------------------------------------------------
# Contents
# --------------------------------------------------------------------------

def crear_content(campaign_id: int, departamento: str, **campos) -> dict | None:
    with _get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT 1 FROM campaigns WHERE id = %s AND departamento = %s",
                (campaign_id, departamento),
            )
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


def obtener_content(content_id: int, departamento: str) -> dict | None:
    with _get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT co.* FROM contents co"
                " JOIN campaigns c ON c.id = co.campaign_id"
                " WHERE co.id = %s AND c.departamento = %s",
                (content_id, departamento),
            )
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


def actualizar_content(content_id: int, departamento: str, **campos) -> bool:
    permitidos = (
        "titulo", "tipo", "plataforma", "fecha_publicacion", "estado", "script",
        "copy_texto", "cta", "hashtags", "idea_visual", "responsables", "enlaces",
    )
    actualizado = _actualizar("contents", content_id, permitidos, campos, departamento)

    # Publicar un contenido cierra solo sus tareas todavía abiertas: antes
    # "publicado" y "tareas acabadas" eran dos cosas que había que marcar por
    # separado, y era fácil dejarte la segunda.
    if actualizado and campos.get("estado") == "publicado":
        with _get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE tasks SET estado = 'acabado', updated_at = NOW()
                    WHERE content_id = %s AND departamento = %s AND estado != 'acabado'
                    """,
                    (content_id, departamento),
                )
            conn.commit()

    return actualizado


def eliminar_content(content_id: int, departamento: str) -> bool:
    return _eliminar("contents", content_id, departamento)


# --------------------------------------------------------------------------
# Tasks
# --------------------------------------------------------------------------

def listar_tasks(departamento: str) -> list[dict]:
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


def tareas_que_vencen(fecha: date) -> list[dict]:
    """Tareas de cualquier departamento con deadline exactamente `fecha` y
    todavía sin acabar. Sin filtro de departamento a propósito: el aviso lo
    dispara un cron, no una sesión de equipo -- lo agrupa por departamento
    quien lo llama (ver `services/slack.py`), no aquí.
    """
    with _get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT * FROM tasks
                WHERE deadline = %s AND estado != 'acabado'
                ORDER BY departamento, id
                """,
                (fecha,),
            )
            return [_serializar(f) for f in cur.fetchall()]


def mis_tareas(email: str) -> list[dict]:
    """Las tareas abiertas de una persona, de cualquier departamento al que
    pertenezca -- para el "Inicio" de /equipo, que es de toda la sesión y no
    de un departamento. Quien está en uno solo ve lo mismo que en el
    resumen de su departamento; quien está en varios los ve juntos, sin
    entrar uno por uno.
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
                WHERE %s = ANY(t.responsables) AND t.estado != 'acabado'
                ORDER BY COALESCE(t.deadline, '9999-12-31'::date), t.id
                """,
                (email,),
            )
            return [_serializar(f) for f in cur.fetchall()]


def obtener_task(task_id: int, departamento: str) -> dict | None:
    with _get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM tasks WHERE id = %s AND departamento = %s",
                (task_id, departamento),
            )
            fila = cur.fetchone()
    return _serializar(fila) if fila is not None else None


def crear_task(**campos) -> dict | None:
    campaign_id = campos.get("campaign_id")
    content_id = campos.get("content_id")
    departamento = campos.get("departamento", "marketing")

    with _get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Un content_id manda: la tarea hereda la campaña de su contenido,
            # así no puede quedar colgando de una campaña distinta a la suya.
            # El contenido/campaña tienen que ser del mismo departamento que la
            # tarea, o se podría colgar una tarea de Eventos de una campaña de
            # Marketing pasando su id.
            if content_id is not None:
                cur.execute(
                    "SELECT co.campaign_id FROM contents co"
                    " JOIN campaigns c ON c.id = co.campaign_id"
                    " WHERE co.id = %s AND c.departamento = %s",
                    (content_id, departamento),
                )
                fila = cur.fetchone()
                if fila is None:
                    return None
                campaign_id = fila["campaign_id"]
            elif campaign_id is not None:
                cur.execute(
                    "SELECT 1 FROM campaigns WHERE id = %s AND departamento = %s",
                    (campaign_id, departamento),
                )
                if cur.fetchone() is None:
                    return None

            cur.execute(
                """
                INSERT INTO tasks (
                    departamento, campaign_id, content_id, titulo, descripcion,
                    estado, prioridad, deadline, hora, responsables, tags,
                    checklist, enlaces, creado_por
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
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
                    campos.get("hora", ""),
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


def actualizar_task(task_id: int, departamento: str, **campos) -> bool:
    permitidos = (
        "titulo", "descripcion", "estado", "prioridad", "deadline", "hora",
        "responsables", "tags", "checklist", "enlaces",
    )
    if "checklist" in campos:
        campos = dict(campos, checklist=json.dumps(campos["checklist"]))
    return _actualizar("tasks", task_id, permitidos, campos, departamento)


def eliminar_task(task_id: int, departamento: str) -> bool:
    return _eliminar("tasks", task_id, departamento)


# --------------------------------------------------------------------------
# Comentarios de una tarea
# --------------------------------------------------------------------------

def listar_task_comments(task_id: int) -> list[dict]:
    with _get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM task_comments WHERE task_id = %s ORDER BY id",
                (task_id,),
            )
            return [_serializar(f) for f in cur.fetchall()]


def crear_task_comment(task_id: int, autor: str, texto: str) -> dict:
    with _get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO task_comments (task_id, autor, texto)
                VALUES (%s, %s, %s)
                RETURNING *
                """,
                (task_id, autor, texto),
            )
            fila = cur.fetchone()
        conn.commit()
    return _serializar(fila)


# --------------------------------------------------------------------------
# Calendario
# --------------------------------------------------------------------------

def calendario(desde: date, hasta: date, departamento: str) -> list[dict]:
    """Vista de solo lectura sobre lo que ya existe: no hay tabla de calendario.

    Devuelve deadlines de tareas, fechas de publicación de contenidos y
    reuniones en el rango pedido, ya normalizados a la misma forma para que
    el frontend pinte una única lista sin distinguir de dónde sale cada cosa.

    `hora` viaja en todas las filas aunque solo tareas y reuniones puedan
    tenerla (las publicaciones son de día completo, `fecha_publicacion` no
    guarda hora): así la vista semana coloca en su rejilla lo que tiene hora
    real y el resto lo deja en la franja de "todo el día", sin tener que
    mirar `origen` para saberlo.
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
                           co.responsables, NULL::varchar AS hora
                    FROM contents co
                    JOIN campaigns c ON c.id = co.campaign_id
                    WHERE co.fecha_publicacion BETWEEN %(desde)s AND %(hasta)s
                      AND c.departamento = %(departamento)s
                    UNION ALL
                    SELECT 'task' AS origen, t.id, t.titulo,
                           t.deadline AS fecha, t.estado,
                           t.campaign_id, t.prioridad AS detalle,
                           t.prioridad, COALESCE(co.titulo, c.nombre) AS padre,
                           t.responsables, NULLIF(t.hora, '') AS hora
                    FROM tasks t
                    LEFT JOIN contents co ON co.id = t.content_id
                    LEFT JOIN campaigns c ON c.id = t.campaign_id
                    WHERE t.deadline BETWEEN %(desde)s AND %(hasta)s
                      AND t.departamento = %(departamento)s
                    UNION ALL
                    SELECT 'reunion' AS origen, r.id, r.titulo,
                           r.fecha AS fecha, '' AS estado,
                           NULL::integer AS campaign_id, r.objetivo AS detalle,
                           NULL AS prioridad, NULL AS padre,
                           r.asistentes AS responsables, NULLIF(r.hora, '') AS hora
                    FROM reuniones r
                    WHERE r.fecha BETWEEN %(desde)s AND %(hasta)s
                      AND r.departamento = %(departamento)s
                ) x
                ORDER BY fecha,
                         -- La publicación ancla el día; después las tareas por
                         -- urgencia. Alfabético dejaba lo urgente escondido en
                         -- medio de la lista.
                         CASE prioridad
                             WHEN 'alta' THEN 1 WHEN 'media' THEN 2
                             WHEN 'baja' THEN 3 ELSE 0
                         END,
                         hora NULLS LAST,
                         titulo
                """,
                {"desde": desde, "hasta": hasta, "departamento": departamento},
            )
            return [_serializar(f) for f in cur.fetchall()]


def calendario_equipo(desde: date, hasta: date, departamentos: list[str]) -> list[dict]:
    """Como `calendario()`, pero de varios departamentos a la vez y con
    `departamento` en cada fila -- para la lectura cruzada de `/equipo`
    (ver `GET /api/equipo/calendario-equipo`), que no está atada a un solo
    blueprint y por tanto no tiene un `departamento_actual()` que usar."""
    with _get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT * FROM (
                    SELECT 'content' AS origen, co.id, co.titulo,
                           co.fecha_publicacion AS fecha, co.estado,
                           co.campaign_id, co.plataforma AS detalle,
                           NULL AS prioridad, c.nombre AS padre,
                           co.responsables, NULL::varchar AS hora,
                           c.departamento
                    FROM contents co
                    JOIN campaigns c ON c.id = co.campaign_id
                    WHERE co.fecha_publicacion BETWEEN %(desde)s AND %(hasta)s
                      AND c.departamento = ANY(%(departamentos)s)
                    UNION ALL
                    SELECT 'task' AS origen, t.id, t.titulo,
                           t.deadline AS fecha, t.estado,
                           t.campaign_id, t.prioridad AS detalle,
                           t.prioridad, COALESCE(co.titulo, c.nombre) AS padre,
                           t.responsables, NULLIF(t.hora, '') AS hora,
                           t.departamento
                    FROM tasks t
                    LEFT JOIN contents co ON co.id = t.content_id
                    LEFT JOIN campaigns c ON c.id = t.campaign_id
                    WHERE t.deadline BETWEEN %(desde)s AND %(hasta)s
                      AND t.departamento = ANY(%(departamentos)s)
                    UNION ALL
                    SELECT 'reunion' AS origen, r.id, r.titulo,
                           r.fecha AS fecha, '' AS estado,
                           NULL::integer AS campaign_id, r.objetivo AS detalle,
                           NULL AS prioridad, NULL AS padre,
                           r.asistentes AS responsables, NULLIF(r.hora, '') AS hora,
                           r.departamento
                    FROM reuniones r
                    WHERE r.fecha BETWEEN %(desde)s AND %(hasta)s
                      AND r.departamento = ANY(%(departamentos)s)
                ) x
                ORDER BY fecha,
                         CASE prioridad
                             WHEN 'alta' THEN 1 WHEN 'media' THEN 2
                             WHEN 'baja' THEN 3 ELSE 0
                         END,
                         hora NULLS LAST,
                         titulo
                """,
                {"desde": desde, "hasta": hasta, "departamentos": departamentos},
            )
            return [_serializar(f) for f in cur.fetchall()]


# --------------------------------------------------------------------------
# Helpers compartidos
# --------------------------------------------------------------------------

# De qué departamento es una fila, por tabla. `contents` no tiene columna
# propia: hereda la de su campaña, que es lo que la hace de un departamento u
# otro. Va en el WHERE del propio UPDATE/DELETE en vez de en un SELECT previo,
# así no hay hueco entre comprobar y escribir.
_ALCANCE_DEPTO = {
    "campaigns": "departamento = %s",
    "tasks": "departamento = %s",
    "contents": "campaign_id IN (SELECT id FROM campaigns WHERE departamento = %s)",
}


def _actualizar(
    tabla: str, fila_id: int, permitidos: tuple, campos: dict, departamento: str
) -> bool:
    """UPDATE parcial: solo toca las claves presentes en `campos`.

    `tabla` y `permitidos` son literales del código, nunca entrada de usuario:
    las claves que no estén en `permitidos` se descartan antes de construir el
    SQL, así que la interpolación del nombre de columna no es inyectable.

    `departamento` acota la fila: pasar el id de una tarea de otro
    departamento no actualiza nada y devuelve False.
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
    valores += [fila_id, departamento]

    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE {tabla} SET {', '.join(asignaciones)}"
                f" WHERE id = %s AND {_ALCANCE_DEPTO[tabla]}",
                valores,
            )
            actualizado = cur.rowcount > 0
        conn.commit()
    return actualizado


def _eliminar(tabla: str, fila_id: int, departamento: str) -> bool:
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"DELETE FROM {tabla} WHERE id = %s AND {_ALCANCE_DEPTO[tabla]}",
                (fila_id, departamento),
            )
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


# --------------------------------------------------------------------------
# Miembros: carga de trabajo y ficha
# --------------------------------------------------------------------------

def carga_por_miembro(departamento: str) -> dict[str, int]:
    """Tareas sin acabar por persona, en un solo GROUP BY.

    `responsables` es un TEXT[], así que se desenrolla con unnest en vez de
    traerse todas las tareas y contarlas en Python: el tablero de un
    departamento con doscientas tareas seguiría siendo una consulta.
    """
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT responsable, COUNT(*)
                FROM tasks, unnest(responsables) AS responsable
                WHERE departamento = %s AND estado <> 'acabado'
                GROUP BY responsable
                """,
                (departamento,),
            )
            return {fila[0]: fila[1] for fila in cur.fetchall()}


def ficha_miembro(email: str, departamento: str) -> dict:
    """Los tres números de la ficha y su actividad reciente.

    La actividad no necesita tabla de eventos: el estado actual de sus tareas
    ordenado por `updated_at` ya cuenta la historia, y así no hay un registro
    que mantener sincronizado con la realidad.
    """
    with _get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    COUNT(*) FILTER (WHERE estado <> 'acabado') AS abiertas,
                    COUNT(*) FILTER (WHERE estado = 'acabado') AS completadas,
                    COUNT(DISTINCT campaign_id) FILTER (WHERE campaign_id IS NOT NULL)
                        AS campanas
                FROM tasks
                WHERE departamento = %s AND %s = ANY(responsables)
                """,
                (departamento, email),
            )
            totales = cur.fetchone()

            cur.execute(
                """
                SELECT t.id, t.titulo, t.estado, t.updated_at,
                       COALESCE(co.titulo, c.nombre) AS padre
                FROM tasks t
                LEFT JOIN contents co ON co.id = t.content_id
                LEFT JOIN campaigns c ON c.id = t.campaign_id
                WHERE t.departamento = %s AND %s = ANY(t.responsables)
                ORDER BY t.updated_at DESC
                LIMIT 8
                """,
                (departamento, email),
            )
            actividad = [_serializar(f) for f in cur.fetchall()]

    return {
        "abiertas": totales["abiertas"],
        "completadas": totales["completadas"],
        "campanas": totales["campanas"],
        "actividad": actividad,
    }


def salud_equipo(departamento: str) -> dict:
    """Semáforo por persona para el VP: mismo umbral que ya usa `Carga` en el
    frontend (`MembersPanel.tsx`, 4+ tareas abiertas es "no le eches nada
    más") -- no se inventa uno nuevo aquí.

    Tres consultas de agregación en total (carga, última actividad,
    cumplimiento de plazo), ninguna repetida por miembro: un departamento con
    veinte personas cuesta lo mismo que uno con dos.
    """
    from backend.services.equipo import init_equipo_db, miembros_activos

    init_equipo_db()
    emails = [a["email"] for a in miembros_activos(departamento)]

    abiertas_por_email = carga_por_miembro(departamento)

    with _get_connection() as conn:
        with conn.cursor() as cur:
            # MAX(updated_at) sobre TODAS las tareas (no solo las abiertas):
            # "sin actividad todavía" y "activo pero todo acabado" son cosas
            # distintas, y la segunda no debería pintarse inactiva.
            cur.execute(
                """
                SELECT responsable, MAX(updated_at)
                FROM tasks, unnest(responsables) AS responsable
                WHERE departamento = %s
                GROUP BY responsable
                """,
                (departamento,),
            )
            ultima_actividad = dict(cur.fetchall())

            cur.execute(
                """
                SELECT COUNT(*) FILTER (WHERE updated_at::date <= deadline), COUNT(*)
                FROM tasks
                WHERE departamento = %s AND estado = 'acabado' AND deadline IS NOT NULL
                """,
                (departamento,),
            )
            a_tiempo, con_deadline = cur.fetchone()

    hoy = date.today()
    miembros, sobrecargados, inactivos = [], 0, 0
    for email in emails:
        abiertas = abiertas_por_email.get(email, 0)
        ultima = ultima_actividad.get(email)
        dias_inactivo = (hoy - ultima.date()).days if ultima is not None else None

        rojo_por_carga = abiertas >= 4
        rojo_por_inactividad = dias_inactivo is not None and dias_inactivo >= 15
        if rojo_por_carga:
            sobrecargados += 1
        if rojo_por_inactividad:
            inactivos += 1

        if rojo_por_carga or rojo_por_inactividad:
            nivel = "rojo"
        elif abiertas >= 2:
            nivel = "amarillo"
        else:
            nivel = "verde"

        miembros.append({
            "email": email,
            "abiertas": abiertas,
            "dias_inactivo": dias_inactivo,
            "nivel": nivel,
        })

    # Sin tareas acabadas con plazo, un 0%/100% sería un dato inventado: mejor
    # decir que no hay datos que fingir una métrica.
    pct_a_tiempo = round(100 * a_tiempo / con_deadline) if con_deadline else None

    return {
        "total": len(emails),
        "sobrecargados": sobrecargados,
        "inactivos": inactivos,
        "pct_a_tiempo": pct_a_tiempo,
        "miembros": miembros,
    }
