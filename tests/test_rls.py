"""Toda tabla que crea el backend nace con RLS: si no, la API REST de
Supabase la deja leer y escribir a cualquiera con la clave pública."""

import os
import unittest

os.environ["DATABASE_URL"] = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql://telecoemprende:telecoemprende@localhost:5432/telecoemprende_test",
)

import app  # noqa: E402,F401
from backend.services import auditoria, equipo, marketing, notas, registrations, registros  # noqa: E402


class RlsTestCase(unittest.TestCase):
    def test_todas_las_tablas_tienen_rls(self):
        registrations.init_db()
        equipo.init_equipo_db()
        marketing.init_marketing_db()
        registros.init_registros_db()
        notas.init_notas_db()
        auditoria.listar()

        with equipo._get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT relname FROM pg_class WHERE relnamespace = 'public'::regnamespace"
                    " AND relkind = 'r' AND NOT relrowsecurity"
                )
                sin_rls = [f[0] for f in cur.fetchall()]
        self.assertEqual(sin_rls, [])


if __name__ == "__main__":
    unittest.main()
