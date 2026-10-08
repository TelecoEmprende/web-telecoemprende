"""Notas del workspace: páginas tipo Notion (bloques de BlockNote).

A diferencia de los registros de `services/registros.py`, esto no vive dentro
de un solo departamento: una nota es del club entero (`departamento = ''`),
de uno de los departamentos de quien la crea, o privada de su autora. Por eso cuelga de `/api/equipo` y no del
blueprint por departamento, y por eso la visibilidad va en el WHERE de cada
consulta (`_visible`) en vez de en `departamento_actual()`.
"""

import json

import psycopg2
from psycopg2.extras import Json, RealDictCursor

from backend.config import DATABASE_URL

NOTA_COLUMNAS = ("titulo", "contenido", "departamento", "privada", "fijada")


def _get_connection():
    return psycopg2.connect(DATABASE_URL)


def init_notas_db():
    # Mismo motivo que `init_registros_db`: varias peticiones a la vez sobre
    # una base sin la tabla pueden chocar en el catálogo de Postgres.
    try:
        _crear_tablas()
    except psycopg2.errors.UniqueViolation:
        pass


def _crear_tablas():
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS notas (
                    id SERIAL PRIMARY KEY,
                    titulo VARCHAR(160) NOT NULL DEFAULT '',
                    contenido JSONB NOT NULL DEFAULT '[]'::jsonb,
                    departamento VARCHAR(20) NOT NULL DEFAULT '',
                    privada BOOLEAN NOT NULL DEFAULT FALSE,
                    fijada BOOLEAN NOT NULL DEFAULT FALSE,
                    creado_por VARCHAR(120) NOT NULL DEFAULT '',
                    editado_por VARCHAR(120) NOT NULL DEFAULT '',
                    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
                )
            """)
        conn.commit()


def _visible(yo: str, teams: list[str]) -> tuple[str, list]:
    """Lo privado, solo para su autor; lo demás, si es del club o de uno de
    tus departamentos."""
    return (
        " AND ((privada AND creado_por = %s)"
        " OR (NOT privada AND (departamento = '' OR departamento = ANY(%s))))",
        [yo, list(teams)],
    )


def _serializar(fila: dict) -> dict:
    salida = dict(fila)
    for clave, valor in salida.items():
        if hasattr(valor, "isoformat"):
            salida[clave] = valor.isoformat()
    return salida


def _texto_de(bloques, partes: list[str]):
    """Texto plano de un documento de BlockNote, para el resumen."""
    for bloque in bloques if isinstance(bloques, list) else []:
        if not isinstance(bloque, dict):
            continue
        contenido = bloque.get("content")
        if isinstance(contenido, list):
            for trozo in contenido:
                if isinstance(trozo, dict):
                    texto = trozo.get("text")
                    if isinstance(texto, str):
                        partes.append(texto)
                    else:
                        _texto_de(trozo.get("content"), partes)
        _texto_de(bloque.get("children"), partes)


def _checks(bloques, pendientes: list[str]) -> int:
    """Junta en `pendientes` el texto de las casillas sin marcar y devuelve
    cuántas hay marcadas."""
    hechos = 0
    for bloque in bloques if isinstance(bloques, list) else []:
        if not isinstance(bloque, dict):
            continue
        if bloque.get("type") == "checkListItem":
            if (bloque.get("props") or {}).get("checked"):
                hechos += 1
            else:
                partes: list[str] = []
                _texto_de([{**bloque, "children": []}], partes)
                pendientes.append(" ".join(" ".join(partes).split()) or "Sin texto")
        hechos += _checks(bloque.get("children"), pendientes)
    return hechos


def _con_resumen(fila: dict) -> dict:
    contenido = fila.pop("contenido", [])
    partes: list[str] = []
    _texto_de(contenido, partes)
    pendientes: list[str] = []
    hechos = _checks(contenido, pendientes)
    fila["resumen"] = " ".join(" ".join(partes).split())[:220]
    # Las casillas sin marcar, para el "Pendiente" del Inicio: es lo que
    # convierte las notas en la lista de cosas por hacer del club.
    fila["pendientes"] = [t[:160] for t in pendientes[:8]]
    fila["checks_pendientes"] = len(pendientes)
    fila["checks_hechos"] = hechos
    return fila


# --------------------------------------------------------------------------
# Notas
# --------------------------------------------------------------------------

def listar_notas(yo: str, teams: list[str]) -> list[dict]:
    donde, valores = _visible(yo, teams)
    with _get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                f"SELECT * FROM notas WHERE TRUE{donde}"
                " ORDER BY fijada DESC, updated_at DESC, id DESC",
                valores,
            )
            return [_con_resumen(_serializar(f)) for f in cur.fetchall()]


def obtener_nota(nota_id: int, yo: str, teams: list[str]) -> dict | None:
    donde, valores = _visible(yo, teams)
    with _get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(f"SELECT * FROM notas WHERE id = %s{donde}", [nota_id, *valores])
            fila = cur.fetchone()
    return _serializar(fila) if fila else None


def _adaptar(campos: dict) -> dict:
    return {c: Json(v) if c == "contenido" else v for c, v in campos.items()}


def crear_nota(campos: dict, yo: str) -> dict:
    campos = _adaptar(campos)
    columnas = [c for c in NOTA_COLUMNAS if c in campos] + ["creado_por", "editado_por"]
    valores = [campos[c] for c in NOTA_COLUMNAS if c in campos] + [yo, yo]
    with _get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                f"INSERT INTO notas ({', '.join(columnas)})"
                f" VALUES ({', '.join(['%s'] * len(columnas))}) RETURNING *",
                valores,
            )
            fila = cur.fetchone()
        conn.commit()
    return _serializar(fila)


def actualizar_nota(nota_id: int, campos: dict, yo: str, teams: list[str]) -> bool:
    campos = _adaptar(campos)
    asignaciones = [f"{c} = %s" for c in NOTA_COLUMNAS if c in campos]
    valores = [campos[c] for c in NOTA_COLUMNAS if c in campos]
    if not asignaciones:
        return False
    asignaciones += ["editado_por = %s", "updated_at = NOW()"]
    valores.append(yo)
    donde, valores_visible = _visible(yo, teams)
    if "privada" in campos:
        # Solo quien la escribió decide si es privada: si no, cualquiera
        # podría esconderle al resto una nota compartida.
        donde += " AND creado_por = %s"
        valores_visible.append(yo)
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE notas SET {', '.join(asignaciones)} WHERE id = %s{donde}",
                [*valores, nota_id, *valores_visible],
            )
            actualizado = cur.rowcount > 0
        conn.commit()
    return actualizado


def eliminar_nota(nota_id: int, yo: str, teams: list[str]) -> bool:
    donde, valores = _visible(yo, teams)
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(f"DELETE FROM notas WHERE id = %s{donde}", [nota_id, *valores])
            eliminado = cur.rowcount > 0
        conn.commit()
    return eliminado


def tamano_json(valor) -> int:
    return len(json.dumps(valor, ensure_ascii=False))
