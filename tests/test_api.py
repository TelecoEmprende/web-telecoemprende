import os
import unittest

os.environ["ADMIN_PASSWORD"] = "test-admin"
os.environ["DATABASE_URL"] = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql://telecoemprende:telecoemprende@localhost:5432/telecoemprende_test",
)

import app  # noqa: E402
import backend.services.admin as admin_service  # noqa: E402
import backend.services.registrations as registration_service  # noqa: E402
import backend.services.security as security_service  # noqa: E402


class ApiTestCase(unittest.TestCase):
    def setUp(self):
        admin_service.ADMIN_PASSWORD = "test-admin"
        security_service.request_log.clear()

        registration_service.init_db()

        conn = registration_service._get_connection()
        with conn.cursor() as cur:
            cur.execute("DELETE FROM registrations")
        conn.commit()
        conn.close()

        self.client = app.app.test_client()

    def register(self, email="juan@alumnos.upm.es"):
        return self.client.post(
            "/api/registrations",
            json={
                "nombre": "Juan",
                "apellidos": "Perez",
                "escuela": "ETSIT",
                "nivel": "Grado",
                "estudios": "Grado - Ingenieria de Tecnologias y Servicios de Telecomunicacion",
                "email": email,
                "telefono": "600123456",
                "departamento": "Tech/Ingeniería",
                "drive_link": "https://drive.google.com/file/d/test",
                "privacidad": True,
                "evento": "telecoemprende-2026-27",
                "telefono_oculto": "",
            },
        )

    def login(self, password="test-admin"):
        return self.client.post("/api/admin/login", json={"password": password})

    def test_registration_validation_error(self):
        response = self.client.post(
            "/api/registrations", json={"evento": "telecoemprende-2026-27"}
        )

        self.assertEqual(response.status_code, 400)
        payload = response.get_json()
        self.assertFalse(payload["ok"])
        self.assertIn("errors", payload)
        self.assertIn("email", payload["errors"])

    def test_duplicate_email_rejected_after_successful_registration(self):
        first = self.register()
        duplicate = self.register()

        self.assertEqual(first.status_code, 201)
        self.assertEqual(duplicate.status_code, 409)
        self.assertEqual(
            duplicate.get_json()["message"],
            "Ese correo ya está registrado.",
        )

    def test_admin_session_login_and_registrations_flow(self):
        self.register()

        session_before = self.client.get("/api/admin/session")
        login = self.login()
        session_after = self.client.get("/api/admin/session")
        registrations = self.client.get("/api/admin/registrations")

        self.assertEqual(session_before.status_code, 200)
        self.assertFalse(session_before.get_json()["authenticated"])
        self.assertEqual(login.status_code, 200)
        self.assertTrue(session_after.get_json()["authenticated"])
        self.assertEqual(registrations.status_code, 200)
        payload = registrations.get_json()
        self.assertEqual(payload["total"], 1)
        self.assertEqual(payload["registros"][0]["email"], "juan@alumnos.upm.es")

    def test_admin_download_requires_auth_and_returns_file_when_authenticated(self):
        unauthorized = self.client.get("/api/admin/download")
        self.assertEqual(unauthorized.status_code, 401)

        self.register()
        self.login()
        authorized = self.client.get("/api/admin/download")

        self.assertEqual(authorized.status_code, 200)
        self.assertIn(
            "attachment; filename=registros_todos.xlsx",
            authorized.headers["Content-Disposition"],
        )
        authorized.close()


if __name__ == "__main__":
    unittest.main()
