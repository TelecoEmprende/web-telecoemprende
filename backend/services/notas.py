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

NOTA_COLUMNAS = ("titulo", "contenido", "departamento", "privada", "fijada", "proyecto_id")


def _get_connection():
    return psycopg2.connect(DATABASE_URL)


# La autoría es la cuenta (`creado_por_id`, `editado_por_id`); las consultas
# reciben el email de la sesión y lo traducen aquí mismo.
_YO = "(SELECT id FROM equipo_accesos WHERE email = %s)"


def _visible(yo: str, teams: list[str]) -> tuple[str, list]:
    """Lo privado, solo para su autor; lo demás, si es del club o de uno de
    tus departamentos."""
    return (
        f" AND ((privada AND creado_por_id = {_YO})"
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
                f"SELECT * FROM notas_v WHERE TRUE{donde}"
                " ORDER BY fijada DESC, updated_at DESC, id DESC",
                valores,
            )
            return [_con_resumen(_serializar(f)) for f in cur.fetchall()]


def obtener_nota(nota_id: int, yo: str, teams: list[str]) -> dict | None:
    donde, valores = _visible(yo, teams)
    with _get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(f"SELECT * FROM notas_v WHERE id = %s{donde}", [nota_id, *valores])
            fila = cur.fetchone()
    return _serializar(fila) if fila else None


def _adaptar(campos: dict) -> dict:
    return {c: Json(v) if c == "contenido" else v for c, v in campos.items()}


def crear_nota(campos: dict, yo: str) -> dict:
    campos = _adaptar(campos)
    columnas = [c for c in NOTA_COLUMNAS if c in campos]
    valores = [campos[c] for c in columnas] + [yo, yo]
    marcadores = ["%s"] * len(columnas) + [_YO, _YO]
    with _get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                f"INSERT INTO notas ({', '.join(columnas + ['creado_por_id', 'editado_por_id'])})"
                f" VALUES ({', '.join(marcadores)}) RETURNING id",
                valores,
            )
            cur.execute("SELECT * FROM notas_v WHERE id = %s", (cur.fetchone()["id"],))
            fila = cur.fetchone()
        conn.commit()
    return _serializar(fila)


def actualizar_nota(nota_id: int, campos: dict, yo: str, teams: list[str]) -> bool:
    campos = _adaptar(campos)
    asignaciones = [f"{c} = %s" for c in NOTA_COLUMNAS if c in campos]
    valores = [campos[c] for c in NOTA_COLUMNAS if c in campos]
    if not asignaciones:
        return False
    asignaciones += [f"editado_por_id = {_YO}", "updated_at = NOW()"]
    valores.append(yo)
    donde, valores_visible = _visible(yo, teams)
    if "privada" in campos:
        # Solo quien la escribió decide si es privada: si no, cualquiera
        # podría esconderle al resto una nota compartida.
        donde += f" AND creado_por_id = {_YO}"
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


def proyecto_existe(proyecto_id: int) -> bool:
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM campaigns WHERE id = %s", (proyecto_id,))
            return cur.fetchone() is not None


def tamano_json(valor) -> int:
    return len(json.dumps(valor, ensure_ascii=False))
