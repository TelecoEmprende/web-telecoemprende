"""Recuperar la contraseña: enlace por correo de un solo uso y contraseña
provisional que pone un admin."""

import os
import unittest
from unittest.mock import patch

os.environ["DATABASE_URL"] = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql://telecoemprende:telecoemprende@localhost:5432/telecoemprende_test",
)

import app  # noqa: E402
import backend.services.equipo as equipo_service  # noqa: E402
import backend.services.security as security_service  # noqa: E402
from backend.config import MAX_LOGIN_ATTEMPTS_PER_WINDOW  # noqa: E402
from backend.services.db import migrar  # noqa: E402


class RecuperarClaveTestCase(unittest.TestCase):
    def setUp(self):
        security_service.request_log.clear()
        migrar()
        conn = equipo_service._get_connection()
        with conn.cursor() as cur:
            cur.execute("DELETE FROM recuperacion_clave")
            cur.execute("DELETE FROM equipo_accesos")
        conn.commit()
        conn.close()
        equipo_service.crear_equipo_acceso("ana@alumnos.upm.es", "clave-de-ana-1", ["marketing"], nombre="Ana")
        self.enviados = []
        self.patcher = patch(
            "backend.api.equipo.enviar_recuperacion_clave",
            side_effect=lambda email, nombre, enlace, minutos: self.enviados.append((email, nombre, enlace)) or True,
        )
        self.patcher.start()
        app.app.config["TESTING"] = True
        self.client = app.app.test_client()

    def tearDown(self):
        self.patcher.stop()

    def pedir(self, email="ana@alumnos.upm.es"):
        return self.client.post("/api/equipo/olvide-clave", json={"email": email})

    def token_enviado(self):
        enlace = self.enviados[-1][2]
        self.assertTrue(enlace.startswith("https://telecoemprende.es/equipo?recuperar="))
        return enlace.split("recuperar=")[1]

    def entrar(self, password):
        return self.client.post("/api/equipo/login", json={"email": "ana@alumnos.upm.es", "password": password})

    def test_el_enlace_deja_elegir_contrasena_nueva_una_sola_vez(self):
        self.assertEqual(self.pedir().status_code, 200)
        self.assertEqual(self.enviados[0][:2], ("ana@alumnos.upm.es", "Ana"))
        token = self.token_enviado()

        mala = self.client.post("/api/equipo/restablecer-clave", json={"token": token, "nueva": "corta"})
        self.assertEqual(mala.status_code, 400)
        bien = self.client.post("/api/equipo/restablecer-clave", json={"token": token, "nueva": "clave-nueva-2"})
        self.assertEqual(bien.status_code, 200)

        self.assertEqual(self.entrar("clave-de-ana-1").status_code, 401)
        self.assertEqual(self.entrar("clave-nueva-2").status_code, 200)
        # Gastado: no vale una segunda vez.
        otra = self.client.post("/api/equipo/restablecer-clave", json={"token": token, "nueva": "otra-clave-3"})
        self.assertEqual(otra.status_code, 400)

    def test_responde_igual_exista_o_no_la_cuenta(self):
        existe, no_existe = self.pedir(), self.pedir("nadie@alumnos.upm.es")
        self.assertEqual(existe.status_code, no_existe.status_code)
        self.assertEqual(existe.get_json(), no_existe.get_json())
        self.assertEqual(len(self.enviados), 1)

    def test_una_cuenta_sin_activar_no_recibe_enlace(self):
        equipo_service.registrar_equipo_acceso("nueva@alumnos.upm.es", "contrasena-larga")
        self.pedir("nueva@alumnos.upm.es")
        self.assertEqual(self.enviados, [])

    def test_no_se_llena_un_buzon_a_peticiones(self):
        self.pedir()
        self.pedir()
        self.assertEqual(len(self.enviados), 1)

    def test_un_enlace_nuevo_anula_el_anterior(self):
        self.pedir()
        primero = self.token_enviado()
        conn = equipo_service._get_connection()
        with conn.cursor() as cur:
            cur.execute("UPDATE recuperacion_clave SET creado_en = NOW() - interval '5 minutes'")
        conn.commit()
        conn.close()
        self.pedir()
        segundo = self.token_enviado()

        self.assertNotEqual(primero, segundo)
        viejo = self.client.post("/api/equipo/restablecer-clave", json={"token": primero, "nueva": "clave-nueva-2"})
        self.assertEqual(viejo.status_code, 400)
        nuevo = self.client.post("/api/equipo/restablecer-clave", json={"token": segundo, "nueva": "clave-nueva-2"})
        self.assertEqual(nuevo.status_code, 200)

    def test_el_enlace_caduca(self):
        self.pedir()
        token = self.token_enviado()
        conn = equipo_service._get_connection()
        with conn.cursor() as cur:
            cur.execute("UPDATE recuperacion_clave SET expira = NOW() - interval '1 minute'")
        conn.commit()
        conn.close()
        respuesta = self.client.post("/api/equipo/restablecer-clave", json={"token": token, "nueva": "clave-nueva-2"})
        self.assertEqual(respuesta.status_code, 400)

    def test_en_la_base_solo_queda_el_hash_del_token(self):
        self.pedir()
        token = self.token_enviado()
        conn = equipo_service._get_connection()
        with conn.cursor() as cur:
            cur.execute("SELECT token_hash FROM recuperacion_clave")
            (guardado,) = cur.fetchone()
        conn.close()
        self.assertNotEqual(guardado, token)
        self.assertEqual(len(guardado), 64)

    def test_si_el_correo_no_sale_queda_en_la_auditoria(self):
        self.patcher.stop()
        with patch("backend.api.equipo.enviar_recuperacion_clave", return_value=False):
            respuesta = self.pedir()
        self.patcher.start()
        # Quien pide no se entera (misma respuesta); el equipo sí.
        self.assertEqual(respuesta.status_code, 200)
        conn = equipo_service._get_connection()
        with conn.cursor() as cur:
            cur.execute("SELECT email, metodo, ruta FROM auditoria WHERE metodo = 'EMAIL'")
            filas = cur.fetchall()
        conn.close()
        self.assertEqual([f[0] for f in filas], ["ana@alumnos.upm.es"])
        self.assertIn("olvide-clave", filas[0][2])

    def test_el_enlace_apunta_siempre_a_la_web_y_no_al_host_de_la_peticion(self):
        self.client.post(
            "/api/equipo/olvide-clave", json={"email": "ana@alumnos.upm.es"},
            headers={"Host": "malo.example.com", "X-Forwarded-Host": "malo.example.com"},
        )
        self.assertNotIn("malo.example.com", self.enviados[-1][2])

    def test_limita_las_peticiones_por_ip(self):
        for _ in range(MAX_LOGIN_ATTEMPTS_PER_WINDOW):
            self.pedir("nadie@alumnos.upm.es")
        self.assertEqual(self.pedir("nadie@alumnos.upm.es").status_code, 429)


class ClaveProvisionalTestCase(unittest.TestCase):
    def setUp(self):
        security_service.request_log.clear()
        migrar()
        conn = equipo_service._get_connection()
        with conn.cursor() as cur:
            cur.execute("DELETE FROM equipo_accesos")
        conn.commit()
        conn.close()
        equipo_service.crear_equipo_acceso("ana@alumnos.upm.es", "clave-de-ana-1", ["marketing"])
        app.app.config["TESTING"] = True
        self.client = app.app.test_client()
        self.acceso_id = equipo_service.listar_equipo_accesos()[0]["id"]

    def test_solo_un_admin_la_pone(self):
        self.assertEqual(self.client.post(f"/api/admin/equipo/{self.acceso_id}/clave-provisional").status_code, 401)

    def test_la_provisional_vale_una_vez_y_obliga_a_cambiarla(self):
        with self.client.session_transaction() as s:
            s["admin_auth"] = True
        respuesta = self.client.post(f"/api/admin/equipo/{self.acceso_id}/clave-provisional")
        self.assertEqual(respuesta.status_code, 200)
        provisional = respuesta.get_json()["password"]
        self.assertGreaterEqual(len(provisional), 8)

        self.client.post("/api/admin/logout")
        self.assertEqual(
            self.client.post("/api/equipo/login", json={"email": "ana@alumnos.upm.es", "password": "clave-de-ana-1"}).status_code,
            401,
        )
        entrada = self.client.post(
            "/api/equipo/login", json={"email": "ana@alumnos.upm.es", "password": provisional}
        )
        self.assertEqual(entrada.status_code, 200)
        self.assertTrue(entrada.get_json()["cambiar_clave"])
        self.assertTrue(self.client.get("/api/equipo/session").get_json()["cambiar_clave"])

        cambio = self.client.put(
            "/api/equipo/password", json={"actual": provisional, "nueva": "la-que-yo-elijo-1"}
        )
        self.assertEqual(cambio.status_code, 200)
        self.assertFalse(self.client.get("/api/equipo/session").get_json()["cambiar_clave"])
        self.client.post("/api/equipo/logout")
        again = self.client.post(
            "/api/equipo/login", json={"email": "ana@alumnos.upm.es", "password": "la-que-yo-elijo-1"}
        )
        self.assertFalse(again.get_json()["cambiar_clave"])

    def test_cuenta_inexistente(self):
        with self.client.session_transaction() as s:
            s["admin_auth"] = True
        self.assertEqual(self.client.post("/api/admin/equipo/999999/clave-provisional").status_code, 404)


if __name__ == "__main__":
    unittest.main()
