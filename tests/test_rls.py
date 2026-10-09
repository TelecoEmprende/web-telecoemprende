"""Ninguna tabla queda abierta: la API REST de Supabase deja leer y escribir
cualquier tabla de `public` sin RLS a quien tenga la clave pública."""

import os
import unittest

os.environ["DATABASE_URL"] = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql://telecoemprende:telecoemprende@localhost:5432/telecoemprende_test",
)

import app  # noqa: E402,F401
from backend.services import db  # noqa: E402


class RlsTestCase(unittest.TestCase):
    def test_todas_las_tablas_tienen_rls_y_las_vistas_lo_heredan(self):
        db.migrar()
        with db.psycopg2.connect(db.DATABASE_URL) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT relname FROM pg_class WHERE relnamespace = 'public'::regnamespace"
                    " AND relkind = 'r' AND NOT relrowsecurity"
                )
                self.assertEqual(cur.fetchall(), [])
                cur.execute(
                    "SELECT relname FROM pg_class WHERE relnamespace = 'public'::regnamespace"
                    " AND relkind = 'v'"
                    " AND NOT coalesce('security_invoker=true' = ANY(reloptions), false)"
                )
                self.assertEqual(cur.fetchall(), [])


if __name__ == "__main__":
    unittest.main()
