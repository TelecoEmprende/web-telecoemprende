"""Vacía la tabla de tareas del club y deja las métricas a cero.

VACÍA, no borra: `DELETE FROM tasks` quita las filas y deja la tabla, sus
columnas, sus índices y sus claves ajenas intactas. La app sigue funcionando
igual desde el primer segundo, solo que sin tareas -- no hay que volver a
crear nada ni migrar nada.

Se lleva por delante pendientes, en progreso y acabadas -- incluidas las que
ya no salen en el tablero porque se archivaron ("Completadas" no es otra
tabla: son filas de `tasks` con `completado_en` de hace más de un día). Los
comentarios caen solos, `task_comments` tiene ON DELETE CASCADE.

No toca campañas, contenidos, calendario, reuniones, anuncios ni presupuesto.

Las métricas no hay que resetearlas aparte: ninguna se guarda. Carga por
persona, días de inactividad, % a tiempo y salud del equipo se calculan sobre
`tasks` en cada petición, así que al vaciarla salen a cero solas.

Antes de borrar deja una copia en JSON, que es la diferencia entre esto y un
DELETE a mano en el editor de Supabase.

    DATABASE_URL='postgresql://...' python scripts/resetear_tareas.py
    DATABASE_URL='postgresql://...' python scripts/resetear_tareas.py --si

La URL es la de producción (Supabase → Project Settings → Database → URI).
"""

import json
import os
import sys
from datetime import date, datetime
from pathlib import Path

import psycopg2
from psycopg2.extras import RealDictCursor

TABLAS = ("tasks", "task_comments")


def _serializable(valor):
    return valor.isoformat() if isinstance(valor, (datetime, date)) else valor


def main() -> int:
    url = os.environ.get("DATABASE_URL", "").strip()
    if not url:
        print("Falta DATABASE_URL (la de producción, de Supabase).", file=sys.stderr)
        return 1

    # psycopg2 rechaza el parámetro propio de Supabase que trae la URL agrupada
    # (ver CLAUDE.md), así que se quita en vez de obligar a recortarla a mano.
    url = url.replace("&supa=base-pooler.x", "").replace("?supa=base-pooler.x", "")

    with psycopg2.connect(url) as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            copia = {}
            for tabla in TABLAS:
                cur.execute(f"SELECT * FROM {tabla} ORDER BY id")  # noqa: S608 - literal
                copia[tabla] = [
                    {k: _serializable(v) for k, v in fila.items()} for fila in cur.fetchall()
                ]

            cur.execute("SELECT estado, COUNT(*) AS n FROM tasks GROUP BY estado ORDER BY estado")
            por_estado = cur.fetchall()

        total = len(copia["tasks"])
        if total == 0:
            print("No hay ninguna tarea: nada que resetear.")
            return 0

        destino = Path(f"copia-tareas-{datetime.now():%Y%m%d-%H%M%S}.json")
        destino.write_text(json.dumps(copia, ensure_ascii=False, indent=2), encoding="utf-8")

        print(f"{total} tareas ({len(copia['task_comments'])} comentarios):")
        for fila in por_estado:
            print(f"  {fila['estado']:<12} {fila['n']}")
        print(f"\nCopia guardada en {destino.resolve()}")

        if "--si" not in sys.argv:
            print("\nSe vacía la tabla (las filas), no se borra la tabla.")
            print("Esto no se puede deshacer desde la app.")
            if input("Escribe BORRAR para continuar: ").strip() != "BORRAR":
                print("Cancelado, no se ha borrado nada.")
                return 1

        with conn.cursor() as cur:
            cur.execute("DELETE FROM tasks")
            borradas = cur.rowcount
        conn.commit()

    print(f"\nListo: {borradas} tareas fuera. La tabla sigue ahí, vacía.")
    print("Las métricas salen a cero solas: ninguna se guarda, se calculan sobre tasks.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
