"""Marketing: campañas, contenidos y tareas.

Modelo: Campaign -> Content -> Task. Un Content es una pieza de comunicación
(un reel, un post); una Task es trabajo que hay que hacer. Son cosas distintas
con ciclos de vida distintos, por eso no comparten tabla ni estados.

Los responsables y autores son cuentas (`equipo_accesos.id`, con clave
foránea): se escriben en `tarea_responsables`/`entregable_responsables` y en
`creado_por_id`/`autor_id`, y se leen de las vistas `tasks_v`, `contents_v`...,
que los devuelven como emails, que es lo que habla la API (ver services/db.py).
"""

import json
from datetime import date, datetime, timedelta

import psycopg2
from psycopg2.extras import RealDictCursor

from backend.config import DATABASE_URL
from backend.services import historial
from backend.services.db import DatosInvalidos, PERSONAS, fijar_personas, id_de_persona, ids_de_personas


def _get_connection():
    return psycopg2.connect(DATABASE_URL)


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
    """Los proyectos cuyo ámbito incluye el departamento: los suyos, los que
    comparte con otros y los de todo el club."""
    with _get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT c.*,
                       (SELECT COUNT(*) FROM contents_v co WHERE co.campaign_id = c.id)
                           AS total_contents,
                       (SELECT COUNT(*) FROM tasks_v t WHERE t.campaign_id = c.id)
                           AS total_tasks,
                       (SELECT COUNT(*) FROM tasks_v t
                            WHERE t.campaign_id = c.id AND t.estado = 'acabado')
                           AS tareas_acabadas
                FROM campaigns_v c
                WHERE %s = ANY(c.departamentos)
                ORDER BY COALESCE(c.fecha, c.created_at::date) DESC, c.id DESC
            """, (departamento,))
            return [_serializar(f) for f in cur.fetchall()]


def mis_campanas(email: str) -> list[dict]:
    """Campañas de cualquier departamento donde la persona tiene una tarea
    asignada, con su progreso -- para "Mis proyectos" en el Inicio de
    /equipo (mismo criterio cruzado que `mis_tareas`). "Campaña" es la
    entidad que ya hace de proyecto; no hay
    tabla `proyectos` aparte que mantener sincronizada con ella.
    """
    with _get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT c.id, c.nombre, c.departamentos[1] AS departamento,
                       COUNT(t.id) AS total_tasks,
                       COUNT(t.id) FILTER (WHERE t.estado = 'acabado') AS tareas_acabadas
                FROM campaigns_v c
                JOIN tasks_v t ON t.campaign_id = c.id
                WHERE c.archivado = FALSE
                  -- El progreso es del proyecto entero, no solo de "mis"
                  -- tareas dentro de él (por eso el JOIN cuenta todas las de
                  -- la campaña) -- la persona solo decide qué campañas
                  -- aparecen, comprobado aparte con este subquery.
                  AND EXISTS (
                      SELECT 1 FROM tasks_v t2
                      WHERE t2.campaign_id = c.id AND %s = ANY(t2.responsables)
                  )
                GROUP BY c.id, c.nombre, c.departamentos
                ORDER BY c.departamentos[1], c.nombre
                """,
                (email,),
            )
            return [_serializar(f) for f in cur.fetchall()]


def obtener_campaign(campaign_id: int, departamento: str) -> dict | None:
    """Campaña con sus contenidos anidados, y las tareas dentro de cada contenido."""
    with _get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM campaigns_v WHERE id = %s AND %s = ANY(departamentos)",
                (campaign_id, departamento),
            )
            campaign = cur.fetchone()
            if campaign is None:
                return None

            cur.execute(
                "SELECT * FROM contents_v WHERE campaign_id = %s"
                " ORDER BY COALESCE(fecha_publicacion, '9999-12-31'::date), id",
                (campaign_id,),
            )
            contents = [_serializar(f) for f in cur.fetchall()]

            cur.execute(
                "SELECT * FROM tasks_v WHERE campaign_id = %s ORDER BY id",
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


ESTADOS_PROYECTO = ("idea", "activo", "pausado", "cerrado")


def _responsable_id(cur, email: str) -> int | None:
    """Id del responsable de un proyecto (una sola persona); "" = sin
    responsable. Un email sin cuenta es un error, no algo que guardar suelto."""
    email = (email or "").strip().lower()
    if not email:
        return None
    return ids_de_personas(cur, [email])[0]


def crear_campaign(
    nombre: str,
    objetivo: str,
    audiencia: str,
    fecha: date | None,
    creado_por: str,
    departamento: str,
    departamentos: list[str] | None = None,
    estado: str = "activo",
    responsable: str = "",
) -> dict:
    """`departamentos` es el ámbito del proyecto (uno, varios o los tres =
    todo el club); por defecto, el departamento desde el que se crea."""
    ambito = list(dict.fromkeys(departamentos or [departamento]))
    with _get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO campaigns
                    (nombre, objetivo, audiencia, fecha, creado_por_id, departamento,
                     departamentos, estado, responsable_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (
                    nombre, objetivo, audiencia, fecha, id_de_persona(cur, creado_por),
                    ambito[0], ambito, estado, _responsable_id(cur, responsable),
                ),
            )
            nueva_id = cur.fetchone()["id"]
            cur.execute("SELECT * FROM campaigns_v WHERE id = %s", (nueva_id,))
            fila = cur.fetchone()
            historial.registrar(cur, "proyecto", nueva_id, "crear", nombre, creado_por, nueva_id)
        conn.commit()
    return _serializar(fila)


def actualizar_campaign(campaign_id: int, departamento: str, autor: str = "", **campos) -> bool:
    permitidos = (
        "nombre", "objetivo", "audiencia", "fecha", "archivado", "estado",
        "departamentos", "responsable",
    )
    return _actualizar("campaigns", campaign_id, permitidos, campos, departamento, autor)


def eliminar_campaign(campaign_id: int, departamento: str, autor: str = "") -> bool:
    """A la papelera, con sus entregables y tareas: se restaura de una vez."""
    return _eliminar("campaigns", campaign_id, departamento, autor)


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
        departamentos=original["departamentos"],
        estado="idea",
        responsable=original["responsable"],
    )

    def _tarea_en_blanco(tarea: dict) -> dict:
        return {
            "titulo": tarea["titulo"],
            "descripcion": tarea["descripcion"],
            "instrucciones": tarea["instrucciones"],
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

def crear_content(campaign_id: int, departamento: str, autor: str = "", **campos) -> dict | None:
    with _get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT 1 FROM campaigns WHERE id = %s AND %s = ANY(departamentos)"
                " AND deleted_at IS NULL",
                (campaign_id, departamento),
            )
            if cur.fetchone() is None:
                return None

            cur.execute(
                """
                INSERT INTO contents (
                    campaign_id, titulo, tipo, plataforma, fecha_publicacion,
                    estado, script, copy_texto, cta, hashtags, idea_visual, enlaces
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
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
                    campos.get("enlaces", []),
                ),
            )
            nuevo_id = cur.fetchone()["id"]
            fijar_personas(cur, "contents", nuevo_id, campos.get("responsables", []))
            cur.execute("SELECT * FROM contents_v WHERE id = %s", (nuevo_id,))
            fila = cur.fetchone()
            historial.registrar(
                cur, "entregable", nuevo_id, "crear", fila["titulo"], autor, campaign_id
            )
        conn.commit()

    content = _serializar(fila)
    content["tasks"] = []
    return content


def obtener_content(content_id: int, departamento: str) -> dict | None:
    with _get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT co.* FROM contents_v co"
                " JOIN campaigns c ON c.id = co.campaign_id"
                " WHERE co.id = %s AND %s = ANY(c.departamentos)",
                (content_id, departamento),
            )
            fila = cur.fetchone()
            if fila is None:
                return None

            cur.execute(
                "SELECT * FROM tasks_v WHERE content_id = %s ORDER BY id", (content_id,)
            )
            tasks = [_serializar(t) for t in cur.fetchall()]

    content = _serializar(fila)
    content["tasks"] = tasks
    return content


def actualizar_content(content_id: int, departamento: str, autor: str = "", **campos) -> bool:
    permitidos = (
        "titulo", "tipo", "plataforma", "fecha_publicacion", "estado", "script",
        "copy_texto", "cta", "hashtags", "idea_visual", "responsables", "enlaces",
    )
    actualizado = _actualizar("contents", content_id, permitidos, campos, departamento, autor)

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
                      AND deleted_at IS NULL
                    """,
                    (content_id, departamento),
                )
            conn.commit()

    return actualizado


def eliminar_content(content_id: int, departamento: str, autor: str = "") -> bool:
    return _eliminar("contents", content_id, departamento, autor)


# --------------------------------------------------------------------------
# Tasks
# --------------------------------------------------------------------------

def listar_tasks(departamento: str) -> list[dict]:
    """Incluye el nombre del contenido/campaña de cada tarea.

    Sin esto el tablero enseña cuatro filas llamadas "Guion" y tres llamadas
    "Revisión" sin decir de qué son, y quien lo mira tiene que reconstruir de
    memoria a qué reel pertenece cada una.

    Una acabada hace más de un día ya no aparece aquí (ver `listar_tasks_archivadas`):
    el tablero es para lo que todavía se está moviendo, no un archivo de todo
    lo que se ha cerrado alguna vez. No se borra nada -- las métricas leen la
    tabla `tasks` directamente, sin pasar por esta función.
    """
    with _get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT t.*,
                       co.titulo AS content_titulo,
                       c.nombre AS campaign_nombre
                FROM tasks_v t
                LEFT JOIN contents co ON co.id = t.content_id
                LEFT JOIN campaigns c ON c.id = t.campaign_id
                WHERE t.departamento = %s
                  AND NOT (t.estado = 'acabado' AND COALESCE(t.completado_en, t.updated_at) < now() - interval '1 day')
                ORDER BY COALESCE(t.deadline, '9999-12-31'::date), t.id
                """,
                (departamento,),
            )
            return [_serializar(f) for f in cur.fetchall()]


def listar_tasks_archivadas(departamento: str) -> list[dict]:
    """Las tareas que `listar_tasks` ya no enseña: acabadas hace más de un
    día. Es el historial que pide "Completadas" en el panel -- de solo
    lectura, para consultar quién hizo qué y cuándo sin que estorbe en el
    tablero del día a día.
    """
    with _get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT t.*,
                       co.titulo AS content_titulo,
                       c.nombre AS campaign_nombre
                FROM tasks_v t
                LEFT JOIN contents co ON co.id = t.content_id
                LEFT JOIN campaigns c ON c.id = t.campaign_id
                WHERE t.departamento = %s
                  AND t.estado = 'acabado' AND COALESCE(t.completado_en, t.updated_at) < now() - interval '1 day'
                ORDER BY COALESCE(t.completado_en, t.updated_at) DESC
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
                SELECT * FROM tasks_v
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
                FROM tasks_v t
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
                "SELECT * FROM tasks_v WHERE id = %s AND departamento = %s",
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
                    " WHERE co.id = %s AND %s = ANY(c.departamentos)"
                    " AND co.deleted_at IS NULL AND c.deleted_at IS NULL",
                    (content_id, departamento),
                )
                fila = cur.fetchone()
                if fila is None:
                    return None
                campaign_id = fila["campaign_id"]
            elif campaign_id is not None:
                cur.execute(
                    "SELECT 1 FROM campaigns WHERE id = %s AND %s = ANY(departamentos)"
                    " AND deleted_at IS NULL",
                    (campaign_id, departamento),
                )
                if cur.fetchone() is None:
                    return None

            cur.execute(
                """
                INSERT INTO tasks (
                    departamento, campaign_id, content_id, titulo, descripcion,
                    instrucciones, estado, prioridad, deadline, hora,
                    tags, checklist, enlaces, creado_por_id
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (
                    campos.get("departamento", "marketing"),
                    campaign_id,
                    content_id,
                    campos.get("titulo", ""),
                    campos.get("descripcion", ""),
                    campos.get("instrucciones", ""),
                    campos.get("estado", "pendiente"),
                    campos.get("prioridad", "media"),
                    campos.get("deadline"),
                    campos.get("hora", ""),
                    campos.get("tags", []),
                    json.dumps(campos.get("checklist", [])),
                    campos.get("enlaces", []),
                    id_de_persona(cur, campos.get("creado_por", "")),
                ),
            )
            nueva_id = cur.fetchone()["id"]
            fijar_personas(cur, "tasks", nueva_id, campos.get("responsables", []))
            cur.execute("SELECT * FROM tasks_v WHERE id = %s", (nueva_id,))
            nueva = cur.fetchone()
            historial.registrar(
                cur, "tarea", nueva_id, "crear", nueva["titulo"], campos.get("creado_por", ""),
                campaign_id,
            )
        conn.commit()
    return _serializar(nueva)


def actualizar_task(task_id: int, departamento_actual: str, autor: str = "", **campos) -> bool:
    """`departamento_actual` es el departamento donde vive la fila ahora (para
    el WHERE); si se está moviendo la tarea, el destino va en
    `campos["departamento"]` -- distinto nombre a propósito, porque
    `**campos` puede traer una clave `"departamento"` y no puede chocar con
    un parámetro posicional del mismo nombre (`TypeError: multiple values`)."""
    permitidos = (
        "titulo", "descripcion", "instrucciones", "estado", "prioridad", "deadline",
        "hora", "responsables", "tags", "checklist", "enlaces", "completado_en",
        "departamento", "campaign_id", "content_id",
    )
    if campos.get("departamento") not in (None, departamento_actual):
        # La campaña/contenido de los que cuelga son del departamento viejo
        # (`crear_task` lo exige), así que al mudarse se queda suelta en vez
        # de colgando de algo que ya no se ve desde su tablero.
        campos = dict(campos, campaign_id=None, content_id=None)
    if "checklist" in campos:
        campos = dict(campos, checklist=json.dumps(campos["checklist"]))
    if "estado" in campos:
        # El diálogo de edición reenvía el estado tal cual en cada guardado,
        # aunque no haya cambiado (ver TaskDialog.tsx) -- solo se toca
        # `completado_en` cuando de verdad se entra o se sale de 'acabado',
        # nunca en un guardado que la deja igual.
        anterior = obtener_task(task_id, departamento_actual)
        ya_acabada = anterior is not None and anterior["estado"] == "acabado"
        if campos["estado"] == "acabado" and not ya_acabada:
            campos = dict(campos, completado_en=datetime.now())
        elif campos["estado"] != "acabado" and ya_acabada:
            campos = dict(campos, completado_en=None)
    return _actualizar("tasks", task_id, permitidos, campos, departamento_actual, autor)


def eliminar_task(task_id: int, departamento: str, autor: str = "") -> bool:
    return _eliminar("tasks", task_id, departamento, autor)


# --------------------------------------------------------------------------
# Comentarios de una tarea
# --------------------------------------------------------------------------

def listar_task_comments(task_id: int) -> list[dict]:
    with _get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM task_comments_v WHERE task_id = %s ORDER BY id",
                (task_id,),
            )
            return [_serializar(f) for f in cur.fetchall()]


def crear_task_comment(task_id: int, autor: str, texto: str) -> dict:
    with _get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO task_comments (task_id, autor_id, texto)
                VALUES (%s, %s, %s)
                RETURNING id
                """,
                (task_id, id_de_persona(cur, autor), texto),
            )
            cur.execute("SELECT * FROM task_comments_v WHERE id = %s", (cur.fetchone()["id"],))
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
                    FROM contents_v co
                    JOIN campaigns_v c ON c.id = co.campaign_id
                    WHERE co.fecha_publicacion BETWEEN %(desde)s AND %(hasta)s
                      AND %(departamento)s = ANY(c.departamentos)
                    UNION ALL
                    SELECT 'task' AS origen, t.id, t.titulo,
                           t.deadline AS fecha, t.estado,
                           t.campaign_id, t.prioridad AS detalle,
                           t.prioridad, COALESCE(co.titulo, c.nombre) AS padre,
                           t.responsables, NULLIF(t.hora, '') AS hora
                    FROM tasks_v t
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
                    FROM reuniones_v r
                    WHERE r.fecha BETWEEN %(desde)s AND %(hasta)s
                      AND r.departamento IN (%(departamento)s, '')
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
    blueprint y por tanto no tiene un `departamento_actual()` que usar.

    Incluye además los eventos del club puestos desde /admin, que no son de
    ningún departamento y por tanto salen siempre."""
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
                    FROM contents_v co
                    JOIN campaigns_v c ON c.id = co.campaign_id
                    WHERE co.fecha_publicacion BETWEEN %(desde)s AND %(hasta)s
                      AND c.departamentos && %(departamentos)s
                    UNION ALL
                    SELECT 'task' AS origen, t.id, t.titulo,
                           t.deadline AS fecha, t.estado,
                           t.campaign_id, t.prioridad AS detalle,
                           t.prioridad, COALESCE(co.titulo, c.nombre) AS padre,
                           t.responsables, NULLIF(t.hora, '') AS hora,
                           t.departamento
                    FROM tasks_v t
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
                    FROM reuniones_v r
                    WHERE r.fecha BETWEEN %(desde)s AND %(hasta)s
                      AND (r.departamento = ANY(%(departamentos)s) OR r.departamento = '')
                    UNION ALL
                    -- Los eventos que pone el club desde /admin (charlas de
                    -- alumni, feria, asambleas...). Sin filtro de
                    -- departamento a propósito: son del club entero, así que
                    -- salen aunque la vista esté filtrada a uno solo -- por
                    -- eso `departamento` viaja NULL y no se les pinta color
                    -- de departamento (ver `botonEvento` en CalendarPanel).
                    SELECT 'club' AS origen, e.id, e.titulo,
                           e.fecha AS fecha, '' AS estado,
                           NULL::integer AS campaign_id, e.descripcion AS detalle,
                           NULL AS prioridad, NULL AS padre,
                           e.confirmados AS responsables, NULLIF(e.hora, '') AS hora,
                           NULL::varchar AS departamento
                    FROM calendario_eventos_v e
                    WHERE e.fecha BETWEEN %(desde)s AND %(hasta)s
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

# De qué departamento es una fila, por tabla. Un proyecto es de todos los
# departamentos de su ámbito; `contents` no tiene columna propia y hereda la de
# su proyecto. Va en el WHERE del propio UPDATE/DELETE en vez de en un SELECT
# previo, así no hay hueco entre comprobar y escribir. Lo que está en la
# papelera no se toca: se restaura primero.
_ALCANCE_DEPTO = {
    "campaigns": "%s = ANY(departamentos) AND deleted_at IS NULL",
    "tasks": "departamento = %s AND deleted_at IS NULL",
    "contents": (
        "campaign_id IN (SELECT id FROM campaigns WHERE %s = ANY(departamentos))"
        " AND deleted_at IS NULL"
    ),
}

_ENTIDAD = {"campaigns": "proyecto", "contents": "entregable", "tasks": "tarea"}
_TITULO = {"campaigns": "nombre", "contents": "titulo", "tasks": "titulo"}


def _proyecto_de(fila: dict, tabla: str) -> int | None:
    return fila["id"] if tabla == "campaigns" else fila.get("campaign_id")


def _actualizar(
    tabla: str, fila_id: int, permitidos: tuple, campos: dict, departamento: str,
    autor: str = "",
) -> bool:
    """UPDATE parcial: solo toca las claves presentes en `campos`.

    `tabla` y `permitidos` son literales del código, nunca entrada de usuario:
    las claves que no estén en `permitidos` se descartan antes de construir el
    SQL, así que la interpolación del nombre de columna no es inyectable.

    `departamento` acota la fila: pasar el id de una tarea de otro
    departamento no actualiza nada y devuelve False. Cada cambio queda en el
    historial con el valor anterior y el nuevo.
    """
    # Las personas no son una columna de la fila: van a su tabla aparte.
    campo_personas = PERSONAS[tabla][2] if tabla in PERSONAS else None
    personas = campos.get(campo_personas) if campo_personas in permitidos else None

    asignaciones = []
    valores: list = []
    for clave in permitidos:
        if clave in campos and clave not in (campo_personas, "responsable"):
            asignaciones.append(f"{clave} = %s")
            valores.append(campos[clave])

    with _get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            if "responsable" in campos and tabla == "campaigns":
                # Una sola persona, que va como id: se traduce aquí.
                asignaciones.append("responsable_id = %s")
                valores.append(_responsable_id(cur, campos["responsable"]))

            if not asignaciones and personas is None:
                return False

            # Lo que había, para el historial: de la vista, que ya trae las
            # personas como emails.
            cur.execute(
                f"SELECT * FROM {tabla}_v WHERE id = %s AND {_ALCANCE_DEPTO[tabla].replace(' AND deleted_at IS NULL', '')}",
                (fila_id, departamento),
            )
            antes = cur.fetchone()
            if antes is None:
                return False

            asignaciones.append("updated_at = NOW()")
            cur.execute(
                f"UPDATE {tabla} SET {', '.join(asignaciones)}"
                f" WHERE id = %s AND {_ALCANCE_DEPTO[tabla]}",
                [*valores, fila_id, departamento],
            )
            actualizado = cur.rowcount > 0
            if actualizado and personas is not None:
                fijar_personas(cur, tabla, fila_id, personas)
            if actualizado:
                despues = {
                    k: (json.loads(v) if k == "checklist" and isinstance(v, str) else v)
                    for k, v in campos.items()
                }
                cambios = historial.diferencias(dict(antes), despues, permitidos)
                if cambios:
                    historial.registrar(
                        cur, _ENTIDAD[tabla], fila_id, "editar", antes[_TITULO[tabla]],
                        autor, _proyecto_de(antes, tabla), cambios,
                    )
        conn.commit()
    return actualizado


def _eliminar(tabla: str, fila_id: int, departamento: str, autor: str = "") -> bool:
    """A la papelera, no borrado de verdad: ver `services/historial.py`."""
    with _get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            enviado = historial.mandar_a_papelera(
                cur, _ENTIDAD[tabla], fila_id, _ALCANCE_DEPTO[tabla], [departamento], autor
            )
        conn.commit()
    return enviado is not None


# --------------------------------------------------------------------------
# Mesa del club
# --------------------------------------------------------------------------

DIAS_ESTANCADO = 14


def mesa_del_club() -> dict:
    """Todo lo que hay sobre la mesa en la reunión semanal: los proyectos que
    siguen vivos (con responsable, siguiente paso y cuánto llevan sin moverse),
    las tareas sin dueño y las atrasadas. Se calcula al momento sobre lo que
    ya hay; no se guarda nada aparte."""
    hoy = date.today()
    with _get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT c.id, c.nombre, c.estado, c.departamentos, c.responsable, c.fecha,
                       COALESCE(a.total, 0) AS total_tasks,
                       COALESCE(a.acabadas, 0) AS tareas_acabadas,
                       GREATEST(c.updated_at, a.ultima) AS ultima_actividad,
                       n.titulo AS siguiente_titulo, n.deadline AS siguiente_deadline,
                       n.responsables AS siguiente_responsables
                FROM campaigns_v c
                LEFT JOIN LATERAL (
                    SELECT COUNT(*) AS total,
                           COUNT(*) FILTER (WHERE estado = 'acabado') AS acabadas,
                           MAX(updated_at) AS ultima
                    FROM tasks_v WHERE campaign_id = c.id
                ) a ON TRUE
                LEFT JOIN LATERAL (
                    SELECT titulo, deadline, responsables FROM tasks_v
                    WHERE campaign_id = c.id AND estado <> 'acabado'
                    ORDER BY COALESCE(deadline, '9999-12-31'::date), id LIMIT 1
                ) n ON TRUE
                WHERE NOT c.archivado AND c.estado <> 'cerrado'
                ORDER BY CASE c.estado WHEN 'activo' THEN 0 WHEN 'idea' THEN 1 ELSE 2 END,
                         c.nombre
                """
            )
            proyectos = []
            for f in cur.fetchall():
                ultima = f["ultima_actividad"]
                dias = (hoy - ultima.date()).days if ultima is not None else None
                proyecto = _serializar(f)
                proyecto["dias_sin_movimiento"] = dias
                # Solo «estancado» lo que debería moverse: un proyecto en pausa
                # o en idea no se queja de no tener actividad.
                proyecto["estancado"] = (
                    f["estado"] == "activo" and dias is not None and dias >= DIAS_ESTANCADO
                )
                proyectos.append(proyecto)

            cur.execute(
                """
                SELECT t.id, t.titulo, t.departamento, t.deadline, t.prioridad,
                       COALESCE(co.titulo, c.nombre) AS padre
                FROM tasks_v t
                LEFT JOIN contents co ON co.id = t.content_id
                LEFT JOIN campaigns c ON c.id = t.campaign_id
                WHERE t.estado <> 'acabado' AND cardinality(t.responsables) = 0
                ORDER BY COALESCE(t.deadline, '9999-12-31'::date), t.id
                LIMIT 40
                """
            )
            sin_dueno = [_serializar(f) for f in cur.fetchall()]

            cur.execute(
                """
                SELECT t.id, t.titulo, t.departamento, t.deadline, t.responsables,
                       COALESCE(co.titulo, c.nombre) AS padre
                FROM tasks_v t
                LEFT JOIN contents co ON co.id = t.content_id
                LEFT JOIN campaigns c ON c.id = t.campaign_id
                WHERE t.estado <> 'acabado' AND t.deadline < %s
                ORDER BY t.deadline, t.id
                LIMIT 40
                """,
                (hoy,),
            )
            atrasadas = [_serializar(f) for f in cur.fetchall()]

    return {
        "proyectos": proyectos,
        "sin_dueno": sin_dueno,
        "atrasadas": atrasadas,
        "sin_responsable": sum(1 for p in proyectos if not p["responsable"]),
        "estancados": sum(1 for p in proyectos if p["estancado"]),
        "dias_estancado": DIAS_ESTANCADO,
    }


# --------------------------------------------------------------------------
# Miembros: carga de trabajo y ficha
# --------------------------------------------------------------------------

def carga_por_miembro(departamento: str) -> dict[str, int]:
    """Tareas sin acabar por persona en un departamento, en un solo GROUP BY.

    `responsables` llega de `tasks_v` como lista, así que se desenrolla con
    unnest en vez de traerse todas las tareas y contarlas en Python: el tablero de un
    departamento con doscientas tareas seguiría siendo una consulta.
    """
    return {email: por[departamento] for email, por in carga_club().items() if por[departamento]}


def carga_club() -> dict[str, dict[str, int]]:
    """Tareas sin acabar por persona y departamento: `{email: {depto: n}}`.
    Con todos en los tres departamentos, la carga que importa es la del club
    entero (la suma) y a la vez la de cada departamento (para proponer a quién
    asignar algo de ese departamento)."""
    from backend.config import EQUIPOS_ORDEN_POR_DEFECTO

    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT responsable, departamento, COUNT(*)
                FROM tasks_v, unnest(responsables) AS responsable
                WHERE estado <> 'acabado'
                GROUP BY responsable, departamento
                """
            )
            filas = cur.fetchall()
    carga: dict[str, dict[str, int]] = {}
    for email, depto, n in filas:
        carga.setdefault(email, dict.fromkeys(EQUIPOS_ORDEN_POR_DEFECTO, 0))[depto] = n
    return {
        email: {**por, "total": sum(por.values())} for email, por in carga.items()
    }


def ficha_miembro(email: str) -> dict:
    """Lo que enseña la ficha de una persona, de todos los departamentos: tres
    números, sus tareas abiertas (con plazo y departamento) y su actividad
    reciente.

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
                FROM tasks_v
                WHERE %s = ANY(responsables)
                """,
                (email,),
            )
            totales = cur.fetchone()

            cur.execute(
                """
                SELECT t.id, t.titulo, t.estado, t.updated_at, t.deadline, t.departamento,
                       COALESCE(co.titulo, c.nombre) AS padre
                FROM tasks_v t
                LEFT JOIN contents co ON co.id = t.content_id
                LEFT JOIN campaigns c ON c.id = t.campaign_id
                WHERE %s = ANY(t.responsables)
                ORDER BY t.updated_at DESC
                LIMIT 8
                """,
                (email,),
            )
            actividad = [_serializar(f) for f in cur.fetchall()]

            cur.execute(
                """
                SELECT t.id, t.titulo, t.estado, t.deadline, t.departamento,
                       COALESCE(co.titulo, c.nombre) AS padre
                FROM tasks_v t
                LEFT JOIN contents co ON co.id = t.content_id
                LEFT JOIN campaigns c ON c.id = t.campaign_id
                WHERE %s = ANY(t.responsables) AND t.estado <> 'acabado'
                ORDER BY COALESCE(t.deadline, '9999-12-31'::date), t.id
                LIMIT 10
                """,
                (email,),
            )
            pendientes = [_serializar(f) for f in cur.fetchall()]

            cur.execute("SELECT COUNT(*) FROM equipo_accesos WHERE activo")
            activos = cur.fetchone()["count"]

    carga = carga_club()
    return {
        "abiertas": totales["abiertas"],
        "completadas": totales["completadas"],
        "campanas": totales["campanas"],
        "actividad": actividad,
        "pendientes": pendientes,
        "abiertas_por_depto": carga.get(email, {}),
        # Tareas abiertas por persona activa, incluidas las que están a cero:
        # es la vara con la que se mide si alguien va cargado.
        "media_club": round(sum(c["total"] for c in carga.values()) / activos, 1) if activos else 0,
    }


def salud_equipo(departamento: str) -> dict:
    """Semáforo por persona para el VP: mismo umbral que ya usa `Carga` en el
    frontend (`MembersPanel.tsx`, 4+ tareas abiertas es "no le eches nada
    más") -- no se inventa uno nuevo aquí.

    Tres consultas de agregación en total (carga, última actividad,
    cumplimiento de plazo), ninguna repetida por miembro: un departamento con
    veinte personas cuesta lo mismo que uno con dos.
    """
    from backend.services.equipo import miembros_activos

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
                FROM tasks_v, unnest(responsables) AS responsable
                WHERE departamento = %s
                GROUP BY responsable
                """,
                (departamento,),
            )
            ultima_actividad = dict(cur.fetchall())

            cur.execute(
                """
                SELECT COUNT(*) FILTER (
                           WHERE COALESCE(completado_en, updated_at)::date <= deadline
                       ), COUNT(*)
                FROM tasks_v
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


def metricas_club(dias_periodo: int = 30) -> dict:
    """Salud del club para el board: el mismo semáforo que `salud_equipo`,
    cruzando los tres departamentos, más productividad por persona.

    Productividad = lo que ya hay en `tasks`, nada nuevo que mantener:
    tareas cerradas en el periodo, % de esas a tiempo, abiertas y vencidas
    ahora mismo. Sin tabla de puntos -- un número inventado no es más fácil
    de entender que cuatro reales, y estos se pueden auditar volviendo a la
    tarea que los generó. "Altas del curso" sigue sin salir de aquí: el
    flujo de solicitud (`registrations`) no tiene un límite de curso claro
    que contar, y un 0 fingido sería peor que no enseñar la tarjeta.
    """
    from backend.config import EQUIPOS_VALIDOS
    from backend.services.equipo import listar_equipo_accesos

    activos = [a for a in listar_equipo_accesos() if a["activo"]]

    hoy = date.today()
    desde_periodo = hoy - timedelta(days=dias_periodo)

    # Asistencia media de los eventos del club ya celebrados en el periodo --
    # sale del check-in real (`evento_asistentes`), no de quién dijo que iba
    # a venir.
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT AVG(COALESCE(array_length(asistio, 1), 0))
                FROM calendario_eventos_v
                WHERE fecha BETWEEN %s AND %s
                """,
                (desde_periodo, hoy),
            )
            promedio = cur.fetchone()[0]
    asistencia_media = round(float(promedio)) if promedio is not None else None

    with _get_connection() as conn:
        with conn.cursor() as cur:
            # Última actividad por persona, en cualquier departamento (no
            # solo uno, a diferencia de `salud_equipo`).
            cur.execute(
                """
                SELECT responsable, MAX(updated_at)
                FROM tasks_v, unnest(responsables) AS responsable
                GROUP BY responsable
                """
            )
            ultima_actividad = dict(cur.fetchall())

            # Carga actual: abiertas y, de esas, vencidas.
            cur.execute(
                """
                SELECT responsable,
                       COUNT(*) FILTER (WHERE estado <> 'acabado') AS abiertas,
                       COUNT(*) FILTER (
                           WHERE estado <> 'acabado' AND deadline IS NOT NULL AND deadline < %s
                       ) AS vencidas
                FROM tasks_v, unnest(responsables) AS responsable
                GROUP BY responsable
                """,
                (hoy,),
            )
            carga = {fila[0]: {"abiertas": fila[1], "vencidas": fila[2]} for fila in cur.fetchall()}

            # Cerradas en el periodo y qué fracción a tiempo.
            cur.execute(
                """
                SELECT responsable,
                       COUNT(*) AS completadas,
                       COUNT(*) FILTER (
                           WHERE deadline IS NOT NULL
                             AND COALESCE(completado_en, updated_at)::date <= deadline
                       ) AS a_tiempo,
                       COUNT(*) FILTER (WHERE deadline IS NOT NULL) AS con_deadline
                FROM tasks_v, unnest(responsables) AS responsable
                WHERE estado = 'acabado' AND COALESCE(completado_en, updated_at) >= %s
                GROUP BY responsable
                """,
                (desde_periodo,),
            )
            productividad = {
                fila[0]: {
                    "completadas": fila[1],
                    "pct_a_tiempo": round(100 * fila[2] / fila[3]) if fila[3] else None,
                }
                for fila in cur.fetchall()
            }

            # Club entero: cuántas cerradas a tiempo del total con plazo, en
            # el periodo -- el mismo cálculo que `pct_a_tiempo` de arriba
            # pero sin agrupar por persona.
            cur.execute(
                """
                SELECT
                    COUNT(*) FILTER (
                        WHERE COALESCE(completado_en, updated_at)::date <= deadline
                    ),
                    COUNT(*)
                FROM tasks_v
                WHERE estado = 'acabado' AND deadline IS NOT NULL
                      AND COALESCE(completado_en, updated_at) >= %s
                """,
                (desde_periodo,),
            )
            a_tiempo_club, con_deadline_club = cur.fetchone()

            # Participación semana a semana: tareas cerradas por semana, ocho
            # semanas atrás. Es un dato real (nadie lo teclea) y de un vistazo
            # se ve si el club está parado o en marcha.
            cur.execute(
                """
                SELECT date_trunc('week', COALESCE(completado_en, updated_at))::date AS semana, COUNT(*)
                FROM tasks_v
                WHERE estado = 'acabado' AND COALESCE(completado_en, updated_at) >= %s
                GROUP BY semana ORDER BY semana
                """,
                (hoy - timedelta(weeks=8),),
            )
            participacion_semanal = [
                {"semana": fila[0].isoformat(), "cerradas": fila[1]} for fila in cur.fetchall()
            ]

            # Último cierre por departamento, para la alerta de "lleva N días
            # sin cerrar nada".
            cur.execute(
                """
                SELECT departamento, MAX(COALESCE(completado_en, updated_at))
                FROM tasks_v WHERE estado = 'acabado'
                GROUP BY departamento
                """
            )
            ultimo_cierre_depto = dict(cur.fetchall())

            # Trabajo abierto y atrasado por departamento: la otra mitad de
            # «de qué pata cojea el club» (la primera es cuánta gente lo
            # prefiere, ver `balance` más abajo).
            cur.execute(
                """
                SELECT departamento,
                       COUNT(*) FILTER (WHERE estado <> 'acabado'),
                       COUNT(*) FILTER (
                           WHERE estado <> 'acabado' AND deadline IS NOT NULL AND deadline < %s
                       )
                FROM tasks_v GROUP BY departamento
                """,
                (hoy,),
            )
            trabajo_depto = {fila[0]: (fila[1], fila[2]) for fila in cur.fetchall()}

    miembros = []
    for acceso in activos:
        email = acceso["email"]
        ultima = ultima_actividad.get(email)
        dias_inactivo = (hoy - ultima.date()).days if ultima is not None else None
        abiertas = carga.get(email, {}).get("abiertas", 0)
        vencidas = carga.get(email, {}).get("vencidas", 0)
        prod = productividad.get(email, {"completadas": 0, "pct_a_tiempo": None})

        # Mismo umbral que `salud_equipo`: no se inventa uno nuevo para el
        # club entero.
        rojo = abiertas >= 4 or (dias_inactivo is not None and dias_inactivo >= 15)
        nivel = "rojo" if rojo else ("amarillo" if abiertas >= 2 else "verde")

        miembros.append({
            "email": email,
            "nombre": acceso["nombre"],
            "equipos": acceso["equipos"],
            "cargo": acceso["cargo"],
            "abiertas": abiertas,
            "vencidas": vencidas,
            "completadas_periodo": prod["completadas"],
            "pct_a_tiempo_periodo": prod["pct_a_tiempo"],
            "dias_inactivo": dias_inactivo,
            "nivel": nivel,
        })

    # Quien más ha cerrado primero dentro de cada semáforo: la tabla se lee
    # de arriba abajo como "a quién mirar primero", no alfabética.
    orden_nivel = {"rojo": 0, "amarillo": 1, "verde": 2}
    miembros.sort(key=lambda m: (orden_nivel[m["nivel"]], -m["completadas_periodo"]))

    por_departamento = {depto: salud_equipo(depto) for depto in sorted(EQUIPOS_VALIDOS)}

    alertas_inactividad = sorted(
        (m for m in miembros if m["nivel"] == "rojo"),
        key=lambda m: -(m["dias_inactivo"] or 0),
    )[:10]

    alertas_departamento = [
        {"departamento": depto, "dias_sin_cerrar": dias}
        for depto in sorted(EQUIPOS_VALIDOS)
        for ultimo in [ultimo_cierre_depto.get(depto)]
        for dias in [(hoy - ultimo.date()).days if ultimo is not None else None]
        if dias is None or dias >= 10
    ]

    # Por departamento: cuánta gente lo tiene como 1ª, 2ª o 3ª preferencia, y
    # cuánto trabajo abierto y atrasado hay. Un departamento con mucho trabajo
    # y poca gente que lo prefiere es de lo que cojea el club.
    balance = {
        depto: {
            "preferencias": [
                sum(1 for a in activos if a["equipos"][posicion] == depto)
                for posicion in range(len(EQUIPOS_VALIDOS))
            ],
            "abiertas": trabajo_depto.get(depto, (0, 0))[0],
            "vencidas": trabajo_depto.get(depto, (0, 0))[1],
        }
        for depto in sorted(EQUIPOS_VALIDOS)
    }

    return {
        "dias_periodo": dias_periodo,
        "balance_departamentos": balance,
        "total_activos": len(activos),
        "sobrecargados": sum(1 for m in miembros if m["abiertas"] >= 4),
        "inactivos": sum(1 for m in miembros if m["dias_inactivo"] is not None and m["dias_inactivo"] >= 15),
        "pct_a_tiempo_club": (
            round(100 * a_tiempo_club / con_deadline_club) if con_deadline_club else None
        ),
        "asistencia_media": asistencia_media,
        "participacion_semanal": participacion_semanal,
        "por_departamento": por_departamento,
        "miembros": miembros,
        "alertas_inactividad": alertas_inactividad,
        "alertas_departamento": alertas_departamento,
    }
