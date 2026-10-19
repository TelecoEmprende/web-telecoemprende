"""Historial y papelera de proyectos, entregables, tareas y notas.

Todos pueden crear, editar y borrar en el club; a cambio, todo queda
apuntado (quién, qué y cuándo) y nada se borra de golpe:

- **Historial** (tabla `history`): una fila por crear, editar, borrar o restaurar,
  con el campo, el valor anterior y el nuevo. Es lo que se enseña en la
  pestaña «Historial» de un proyecto y en la actividad de la Mesa del club.
  Nunca guarda contenidos enteros (un guion, una nota): solo que cambiaron.
- **Papelera**: borrar pone `deleted_at`; las vistas `<tabla>_v` ya no
  enseñan la fila y cualquiera puede restaurarla. Al borrar un proyecto se
  marcan con la misma hora sus entregables y tareas, y restaurarlo los
  devuelve juntos. A los 30 días (cron diario) o por un admin, se borra de
  verdad (`vaciar_papelera`).
"""

from datetime import date, datetime

from psycopg2.extras import Json, RealDictCursor
import psycopg2

from backend.config import DATABASE_URL
from backend.services.db import DatosInvalidos, id_de_persona

DIAS_EN_PAPELERA = 30

# Entidad de la API -> tabla. `deleted_at` y las vistas `<tabla>_v` hacen el resto.
TABLAS = {
    "proyecto": "projects",
    "entregable": "deliverables",
    "tarea": "tasks",
    "nota": "notes",
    "reunion": "meetings",
}
_VISTAS = {
    "proyecto": "projects_v",
    "entregable": "deliverables_v",
    "tarea": "tasks_v",
    "nota": "notes_v",
    "reunion": "meetings_v",
}
# Cómo se llama el título de cada tabla.
_TITULO = {"projects": "name", "deliverables": "title", "tasks": "title", "notes": "title", "meetings": "title"}

_MAX_VALOR = 200


def _get_connection():
    return psycopg2.connect(DATABASE_URL)


# --------------------------------------------------------------------------
# Escribir el historial
# --------------------------------------------------------------------------

def _plano(valor):
    """Un valor tal como se guarda en el historial: JSON sencillo y corto."""
    if isinstance(valor, (datetime, date)):
        return valor.isoformat()
    if isinstance(valor, (list, tuple)):
        return [_plano(v) for v in valor][:20]
    if isinstance(valor, dict):
        return {k: _plano(v) for k, v in list(valor.items())[:20]}
    if isinstance(valor, str):
        return valor if len(valor) <= _MAX_VALOR else valor[:_MAX_VALOR] + "…"
    return valor


def diferencias(antes: dict, despues: dict, campos) -> list[dict]:
    """Los campos de `campos` cuyo valor cambia entre `antes` y `despues`."""
    cambios = []
    for campo in campos:
        if campo not in despues:
            continue
        previo, nuevo = antes.get(campo), despues[campo]
        # Una fecha llega como `date` de la base y como `date` del formulario;
        # una lista de la base y del formulario se comparan igual.
        if _plano(previo) == _plano(nuevo) or (previo in (None, "") and nuevo in (None, "")):
            continue
        cambios.append({"campo": campo, "antes": _plano(previo), "despues": _plano(nuevo)})
    return cambios


def registrar(
    cur,
    entidad: str,
    entidad_id: int,
    accion: str,
    titulo: str,
    autor: str,
    proyecto_id: int | None = None,
    cambios: list[dict] | None = None,
    agrupar_minutos: int = 0,
) -> None:
    """Apunta un cambio en la misma transacción que lo provoca.

    `agrupar_minutos`: si la misma persona ya editó lo mismo hace menos de eso,
    no se repite la entrada (las notas se guardan solas cada pocos segundos).
    """
    persona_id = id_de_persona(cur, autor)
    if agrupar_minutos and accion == "editar":
        cur.execute(
            "SELECT 1 FROM history WHERE entity_type = %s AND entity_id = %s AND action = 'editar'"
            " AND member_id IS NOT DISTINCT FROM %s"
            " AND created_at > NOW() - make_interval(mins => %s)",
            (entidad, entidad_id, persona_id, agrupar_minutos),
        )
        if cur.fetchone() is not None:
            return
    cur.execute(
        "INSERT INTO history (entity_type, entity_id, project_id, action, title, changes, member_id)"
        " VALUES (%s, %s, %s, %s, %s, %s, %s)",
        (entidad, entidad_id, proyecto_id, accion, (titulo or "")[:200], Json(cambios or []), persona_id),
    )


# --------------------------------------------------------------------------
# Leer el historial
# --------------------------------------------------------------------------

# Una nota privada solo la ve su autor: su historial tampoco sale en los
# feeds compartidos (proyecto, club). El resto de entidades son del club.
def _filtro_notas(alias: str = "h") -> str:
    return (
        f"({alias}.entity_type <> 'nota' OR EXISTS ("
        f"  SELECT 1 FROM notes n WHERE n.id = {alias}.entity_id"
        "   AND (NOT n.is_private OR n.created_by_id = (SELECT id FROM members WHERE email = %s))))"
    )


# Una reunión de directiva marcada como solo suya tampoco sale en los feeds de
# quien no es de la directiva. Se exige que la reunión exista y no sea privada
# (y no al revés): una privada ya borrada del todo no dejaría su título suelto.
_FILTRO_REUNIONES = (
    "(%s OR h.entity_type <> 'reunion' OR EXISTS ("
    "  SELECT 1 FROM meetings r WHERE r.id = h.entity_id AND NOT r.board_only))"
)


def listar(
    yo: str,
    entidad: str | None = None,
    entidad_id: int | None = None,
    proyecto_id: int | None = None,
    limite: int = 50,
    directiva: bool = False,
) -> list[dict]:
    donde, valores = ["TRUE"], []
    if entidad is not None:
        donde.append("h.entity_type = %s")
        valores.append(entidad)
    if entidad_id is not None:
        donde.append("h.entity_id = %s")
        valores.append(entidad_id)
    if proyecto_id is not None:
        # Lo del proyecto y lo suyo (sus entregables y tareas llevan su id).
        donde.append("(h.project_id = %s OR (h.entity_type = 'proyecto' AND h.entity_id = %s))")
        valores += [proyecto_id, proyecto_id]
    donde.append(_filtro_notas())
    valores.append(yo)
    donde.append(_FILTRO_REUNIONES)
    valores.append(directiva)
    with _get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT h.id, h.entity_type AS entidad, h.entity_id AS entidad_id,"
                " h.project_id AS proyecto_id, h.action AS accion, h.title AS titulo,"
                " h.changes AS cambios, h.created_at AS creado_en,"
                " COALESCE(p.email, '') AS persona, COALESCE(p.first_name, '') AS persona_nombre"
                " FROM history h LEFT JOIN members p ON p.id = h.member_id"
                f" WHERE {' AND '.join(donde)}"
                " ORDER BY h.created_at DESC, h.id DESC LIMIT %s",
                [*valores, max(1, min(limite, 200))],
            )
            filas = cur.fetchall()
    return [{**f, "creado_en": f["creado_en"].isoformat()} for f in filas]


# --------------------------------------------------------------------------
# Papelera
# --------------------------------------------------------------------------

def mandar_a_papelera(cur, entidad: str, entidad_id: int, alcance: str, valores_alcance: list, autor: str):
    """Marca una fila (y lo que cuelga de ella) como borrada. Devuelve
    `(titulo, proyecto_id)` de lo borrado, o None si no existía o ya estaba en
    la papelera. `alcance` y `valores_alcance` acotan la fila (departamento,
    visibilidad), igual que en el UPDATE de siempre."""
    tabla = TABLAS[entidad]
    cur.execute(
        f"SELECT {_TITULO[tabla]} AS titulo,"
        f" {_PROYECTO_DE[entidad]} AS proyecto_id FROM {tabla}"
        f" WHERE id = %s AND deleted_at IS NULL AND {alcance}",
        [entidad_id, *valores_alcance],
    )
    fila = cur.fetchone()
    if fila is None:
        return None
    titulo, proyecto_id = (fila["titulo"], fila["proyecto_id"]) if isinstance(fila, dict) else fila
    persona = id_de_persona(cur, autor)
    cur.execute("SELECT NOW()")
    ahora = cur.fetchone()
    ahora = ahora["now"] if isinstance(ahora, dict) else ahora[0]
    cur.execute(
        f"UPDATE {tabla} SET deleted_at = %s, deleted_by_id = %s WHERE id = %s",
        (ahora, persona, entidad_id),
    )
    # Lo que cuelga, con la misma hora: así restaurar el padre lo devuelve.
    if entidad == "proyecto":
        for hija in ("deliverables", "tasks"):
            cur.execute(
                f"UPDATE {hija} SET deleted_at = %s, deleted_by_id = %s"
                " WHERE project_id = %s AND deleted_at IS NULL",
                (ahora, persona, entidad_id),
            )
    elif entidad == "entregable":
        cur.execute(
            "UPDATE tasks SET deleted_at = %s, deleted_by_id = %s"
            " WHERE deliverable_id = %s AND deleted_at IS NULL",
            (ahora, persona, entidad_id),
        )
    registrar(cur, entidad, entidad_id, "borrar", titulo, autor, proyecto_id)
    return titulo, proyecto_id


# De qué proyecto cuelga cada cosa (para el historial del proyecto).
_PROYECTO_DE = {
    "proyecto": "id",
    "entregable": "project_id",
    "tarea": "project_id",
    "nota": "project_id",
    "reunion": "NULL",
}


def listar_papelera(yo: str, directiva: bool = False) -> list[dict]:
    """Lo borrado en los últimos 30 días, de cualquier tipo. Las notas
    privadas, solo para su autor; lo borrado con su proyecto cuelga de él y no
    sale suelto (se restaura con el proyecto)."""
    with _get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                f"""
                SELECT * FROM (
                    SELECT 'proyecto' AS entidad, c.id, c.name AS titulo, c.deleted_at,
                           c.deleted_by_id, NULL::text AS padre
                    FROM projects c WHERE c.deleted_at IS NOT NULL
                    UNION ALL
                    SELECT 'entregable', co.id, co.title, co.deleted_at, co.deleted_by_id, p.name
                    FROM deliverables co JOIN projects p ON p.id = co.project_id
                    WHERE co.deleted_at IS NOT NULL
                      AND (p.deleted_at IS NULL OR p.deleted_at <> co.deleted_at)
                    UNION ALL
                    SELECT 'tarea', t.id, t.title, t.deleted_at, t.deleted_by_id,
                           COALESCE(co.title, p.name)
                    FROM tasks t
                    LEFT JOIN deliverables co ON co.id = t.deliverable_id
                    LEFT JOIN projects p ON p.id = t.project_id
                    WHERE t.deleted_at IS NOT NULL
                      AND (co.id IS NULL OR co.deleted_at IS NULL OR co.deleted_at <> t.deleted_at)
                      AND (p.id IS NULL OR p.deleted_at IS NULL OR p.deleted_at <> t.deleted_at)
                    UNION ALL
                    SELECT 'nota', n.id, n.title, n.deleted_at, n.deleted_by_id, NULL
                    FROM notes n
                    WHERE n.deleted_at IS NOT NULL
                      AND (NOT n.is_private OR n.created_by_id = (SELECT id FROM members WHERE email = %s))
                    UNION ALL
                    SELECT 'reunion', r.id, r.title, r.deleted_at, r.deleted_by_id, NULL
                    FROM meetings r WHERE r.deleted_at IS NOT NULL AND (%s OR NOT r.board_only)
                ) x
                WHERE x.deleted_at > NOW() - make_interval(days => {DIAS_EN_PAPELERA})
                ORDER BY x.deleted_at DESC
                """,
                (yo, directiva),
            )
            filas = cur.fetchall()
            ids = {f["deleted_by_id"] for f in filas if f["deleted_by_id"]}
            nombres = {}
            if ids:
                cur.execute(
                    "SELECT id, email, first_name AS nombre FROM members WHERE id = ANY(%s)", (list(ids),)
                )
                nombres = {p["id"]: p for p in cur.fetchall()}
    salida = []
    for f in filas:
        quien = nombres.get(f["deleted_by_id"])
        salida.append({
            "entidad": f["entidad"],
            "id": f["id"],
            "titulo": f["titulo"],
            "padre": f["padre"],
            "borrado_en": f["deleted_at"].isoformat(),
            "borrado_por": quien["email"] if quien else "",
            "borrado_por_nombre": quien["nombre"] if quien else "",
        })
    return salida


def restaurar(entidad: str, entidad_id: int, autor: str, directiva: bool = False) -> bool:
    """Saca de la papelera una fila y lo que se borró con ella. False si no
    está en la papelera. Un entregable o una tarea no se restauran dentro de
    un proyecto o entregable que sigue borrado: primero ese."""
    if entidad not in TABLAS:
        return False
    tabla = TABLAS[entidad]
    with _get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                f"SELECT {_TITULO[tabla]} AS titulo, {_PROYECTO_DE[entidad]} AS proyecto_id,"
                f" deleted_at FROM {tabla} WHERE id = %s AND deleted_at IS NOT NULL"
                + (
                    " AND (NOT is_private OR created_by_id = (SELECT id FROM members WHERE email = %s))"
                    if entidad == "nota"
                    else ""
                )
                # Las de directiva solo las escribe la directiva (ver `registros._alcance`).
                + (" AND (%s OR department <> 'directiva')" if entidad == "reunion" else ""),
                [
                    entidad_id,
                    *([autor] if entidad == "nota" else []),
                    *([directiva] if entidad == "reunion" else []),
                ],
            )
            fila = cur.fetchone()
            if fila is None:
                return False
            marca = fila["deleted_at"]
            if entidad in ("entregable", "tarea"):
                _comprobar_padres(cur, entidad, entidad_id, marca)
            cur.execute(f"UPDATE {tabla} SET deleted_at = NULL, deleted_by_id = NULL WHERE id = %s", (entidad_id,))
            if entidad == "proyecto":
                for hija in ("deliverables", "tasks"):
                    cur.execute(
                        f"UPDATE {hija} SET deleted_at = NULL, deleted_by_id = NULL"
                        " WHERE project_id = %s AND deleted_at = %s",
                        (entidad_id, marca),
                    )
            elif entidad == "entregable":
                cur.execute(
                    "UPDATE tasks SET deleted_at = NULL, deleted_by_id = NULL"
                    " WHERE deliverable_id = %s AND deleted_at = %s",
                    (entidad_id, marca),
                )
            registrar(cur, entidad, entidad_id, "restaurar", fila["titulo"], autor, fila["proyecto_id"])
        conn.commit()
    return True


def _comprobar_padres(cur, entidad: str, entidad_id: int, marca) -> None:
    """Restaurar algo que cuelga de un proyecto o entregable borrado lo
    dejaría invisible: se pide restaurar antes al padre."""
    if entidad == "entregable":
        cur.execute(
            "SELECT p.name AS nombre FROM deliverables co JOIN projects p ON p.id = co.project_id"
            " WHERE co.id = %s AND p.deleted_at IS NOT NULL",
            (entidad_id,),
        )
        padre = cur.fetchone()
        if padre is not None:
            raise DatosInvalidos(f"Restaura antes el proyecto «{padre['nombre']}».")
    else:
        cur.execute(
            "SELECT p.name AS proyecto, co.title AS entregable FROM tasks t"
            " LEFT JOIN projects p ON p.id = t.project_id AND p.deleted_at IS NOT NULL"
            " LEFT JOIN deliverables co ON co.id = t.deliverable_id AND co.deleted_at IS NOT NULL"
            " WHERE t.id = %s",
            (entidad_id,),
        )
        padres = cur.fetchone()
        if padres and padres["proyecto"]:
            raise DatosInvalidos(f"Restaura antes el proyecto «{padres['proyecto']}».")
        if padres and padres["entregable"]:
            raise DatosInvalidos(f"Restaura antes el entregable «{padres['entregable']}».")


def vaciar_papelera(entidad: str | None = None, entidad_id: int | None = None) -> int:
    """Borra de verdad. Con `entidad` y `entidad_id`, solo esa fila (y lo que
    se borró con ella); sin ellos, todo lo que lleva más de 30 días. Devuelve
    cuántas filas se han ido."""
    total = 0
    with _get_connection() as conn:
        with conn.cursor() as cur:
            if entidad is not None:
                tabla = TABLAS[entidad]
                cur.execute(f"DELETE FROM {tabla} WHERE id = %s AND deleted_at IS NOT NULL", (entidad_id,))
                total = cur.rowcount
            else:
                for tabla in ("tasks", "deliverables", "projects", "notes", "meetings"):
                    cur.execute(
                        f"DELETE FROM {tabla} WHERE deleted_at IS NOT NULL"
                        f" AND deleted_at < NOW() - make_interval(days => {DIAS_EN_PAPELERA})"
                    )
                    total += cur.rowcount
        conn.commit()
    return total
