"""Alta propia de cuentas de equipo (POST /api/equipo/registro).

ponytail: feature temporal mientras entra el equipo; este archivo se borra con
ella. Lo que se comprueba es lo único que la hace segura: la cuenta nace sin
equipos y desactivada, así que no da acceso a nada hasta que admin la activa.
"""

import os
import unittest

os.environ["ADMIN_PASSWORD"] = "test-admin"
os.environ["DATABASE_URL"] = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql://telecoemprende:telecoemprende@localhost:5432/telecoemprende_test",
)

import app  # noqa: E402
import backend.services.equipo as equipo_service  # noqa: E402
import backend.services.security as security_service  # noqa: E402


class EquipoRegistroTestCase(unittest.TestCase):
    def setUp(self):
        security_service.request_log.clear()
        equipo_service.init_equipo_db()

        conn = equipo_service._get_connection()
        with conn.cursor() as cur:
            cur.execute("DELETE FROM equipo_accesos")
        conn.commit()
        conn.close()

        app.app.config["TESTING"] = True
        self.client = app.app.test_client()

    def registro(self, email="nuevo@example.com", password="contrasena-larga"):
        return self.client.post(
            "/api/equipo/registro", json={"email": email, "password": password}
        )

    def test_crea_la_cuenta_sin_equipos_y_desactivada(self):
        self.assertEqual(self.registro().status_code, 201)

        accesos = equipo_service.listar_equipo_accesos()
        self.assertEqual(len(accesos), 1)
        self.assertEqual(accesos[0]["email"], "nuevo@example.com")
        self.assertEqual(accesos[0]["equipos"], [])
        self.assertEqual(accesos[0]["cargo"], "")
        self.assertFalse(accesos[0]["activo"])

    def test_no_puede_entrar_hasta_que_admin_la_activa(self):
        self.registro()

        respuesta = self.client.post(
            "/api/equipo/login",
            json={"email": "nuevo@example.com", "password": "contrasena-larga"},
        )
        self.assertEqual(respuesta.status_code, 401)

        acceso_id = equipo_service.listar_equipo_accesos()[0]["id"]
        equipo_service.actualizar_equipo_acceso(acceso_id, equipos=["marketing"], activo=True)

        respuesta = self.client.post(
            "/api/equipo/login",
            json={"email": "nuevo@example.com", "password": "contrasena-larga"},
        )
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.get_json()["teams"], ["marketing"])

    def test_email_ya_dado_de_alta_no_pisa_la_cuenta_existente(self):
        self.registro()
        acceso_id = equipo_service.listar_equipo_accesos()[0]["id"]
        equipo_service.actualizar_equipo_acceso(acceso_id, equipos=["eventos"], activo=True)

        # Misma respuesta que un alta nueva (no enumera correos), pero la fila
        # de verdad no se toca: ni la contraseña ni los permisos.
        self.assertEqual(self.registro(password="otra-contrasena").status_code, 201)

        accesos = equipo_service.listar_equipo_accesos()
        self.assertEqual(len(accesos), 1)
        self.assertEqual(accesos[0]["equipos"], ["eventos"])
        self.assertTrue(accesos[0]["activo"])
        respuesta = self.client.post(
            "/api/equipo/login",
            json={"email": "nuevo@example.com", "password": "contrasena-larga"},
        )
        self.assertEqual(respuesta.status_code, 200)

    def test_contrasena_corta_o_email_invalido(self):
        self.assertEqual(self.registro(password="corta").status_code, 400)
        self.assertEqual(self.registro(email="sin-arroba").status_code, 400)
        self.assertEqual(equipo_service.listar_equipo_accesos(), [])


if __name__ == "__main__":
    unittest.main()
