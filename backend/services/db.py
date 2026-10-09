"""Lo común a todas las tablas que crea el backend."""


def activar_rls(cur, *tablas: str) -> None:
    """Supabase publica cada tabla de `public` en su API REST, a la que entra
    cualquiera con la clave pública del proyecto. RLS sin políticas la cierra
    del todo para esa API; el backend, dueño de las tablas, no se ve afectado.
    Idempotente: se llama cada vez que se crean o revisan las tablas.
    """
    for tabla in tablas:
        cur.execute(f"ALTER TABLE {tabla} ENABLE ROW LEVEL SECURITY")
