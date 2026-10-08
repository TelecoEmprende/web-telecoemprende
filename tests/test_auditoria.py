"""Registro de auditoría de /equipo (`services/auditoria.py`)."""

import os
import unittest

os.environ["DATABASE_URL"] = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql://telecoemprende:telecoemprende@localhost:5432/telecoemprende_test",
)

import app  # noqa: E402
import backend.services.auditoria as auditoria  # noqa: E402
import backend.services.equipo as equipo_service  # noqa: E402
import backend.services.security as security_service  # noqa: E402
from werkzeug.security import generate_password_hash  # noqa: E402


class AuditoriaTestCase(unittest.TestCase):
    def setUp(self):
        security_service.request_log.clear()
        equipo_service.init_equipo_db()
        auditoria.listar()  # crea la tabla
        conn = equipo_service._get_connection()
        with conn.cursor() as cur:
            cur.execute("DELETE FROM auditoria")
            cur.execute("DELETE FROM equipo_accesos")
            cur.execute(
                "INSERT INTO equipo_accesos (email, password_hash, equipos, es_admin) VALUES (%s, %s, %s, %s)",
                ("ana@example.com", generate_password_hash("pw"), ["marketing", "eventos"], True),
            )
        conn.commit()
        conn.close()
        app.app.config["TESTING"] = True
        self.client = app.app.test_client()

    def test_registra_cambios_y_sesiones_sin_guardar_el_cuerpo(self):
        self.client.post("/api/equipo/login", json={"email": "nadie@example.com", "password": "secreta"})
        self.client.post("/api/equipo/login", json={"email": "ana@example.com", "password": "pw"})
        self.client.get("/api/equipo/notas")  # una lectura no se apunta
        self.client.post("/api/equipo/notas", json={"titulo": "Plan", "contenido": []})
        self.client.post("/api/equipo/logout")

        # Tras el logout ya no hay sesión de admin para consultarlo.
        self.assertEqual(self.client.get("/api/admin/auditoria").status_code, 401)

        registros = auditoria.listar()
        resumen = [(r["email"], r["metodo"], r["ruta"], r["estado"]) for r in reversed(registros)]
        self.assertEqual(resumen, [
            ("nadie@example.com", "POST", "/api/equipo/login", 401),
            ("ana@example.com", "POST", "/api/equipo/login", 200),
            ("ana@example.com", "POST", "/api/equipo/notas", 201),
            ("ana@example.com", "POST", "/api/equipo/logout", 200),
        ])
        self.assertNotIn("secreta", str(registros))

    def test_solo_admin_lo_consulta_y_filtra(self):
        self.assertEqual(self.client.get("/api/admin/auditoria").status_code, 401)
        self.client.post("/api/equipo/login", json={"email": "ana@example.com", "password": "pw"})
        self.client.post("/api/equipo/notas", json={"titulo": "Plan", "contenido": []})

        todas = self.client.get("/api/admin/auditoria").get_json()["registros"]
        notas = self.client.get("/api/admin/auditoria?q=notas").get_json()["registros"]
        self.assertGreaterEqual(len(todas), 2)
        self.assertEqual([r["ruta"] for r in notas], ["/api/equipo/notas"])


if __name__ == "__main__":
    unittest.main()
