import os
import tempfile
import unittest
from pathlib import Path

os.environ["ADMIN_PASSWORD"] = "test-admin"

import app  # noqa: E402
import backend.api.admin as admin_api  # noqa: E402
import backend.config as config  # noqa: E402
import backend.services.admin as admin_service  # noqa: E402
import backend.services.registrations as registration_service  # noqa: E402
import backend.services.security as security_service  # noqa: E402


class ApiTestCase(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.excel_path = Path(self.temp_dir.name) / "registros_test.xlsx"

        config.EXCEL_FILE = self.excel_path
        registration_service.EXCEL_FILE = self.excel_path
        admin_api.EXCEL_FILE = self.excel_path
        app.EXCEL_FILE = self.excel_path
        admin_service.ADMIN_PASSWORD = "test-admin"
        security_service.request_log.clear()

        self.client = app.app.test_client()

    def tearDown(self):
        self.temp_dir.cleanup()

    def register(self, email="juan@example.com"):
        return self.client.post(
            "/api/registrations",
            json={
                "nombre": "Juan",
                "apellidos": "Perez",
                "estudios": "ETSIT UPM",
                "email": email,
                "privacidad": True,
                "telefono_oculto": "",
            },
        )

    def login(self, password="test-admin"):
        return self.client.post("/api/admin/login", json={"password": password})

    def test_registration_validation_error(self):
        response = self.client.post("/api/registrations", json={})

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
        self.assertEqual(payload["registros"][0]["email"], "juan@example.com")

    def test_admin_download_requires_auth_and_returns_file_when_authenticated(self):
        unauthorized = self.client.get("/api/admin/download")
        self.assertEqual(unauthorized.status_code, 401)

        self.register()
        self.login()
        authorized = self.client.get("/api/admin/download")

        self.assertEqual(authorized.status_code, 200)
        self.assertIn(
            "attachment; filename=registros_telecoemprende.xlsx",
            authorized.headers["Content-Disposition"],
        )
        authorized.close()


if __name__ == "__main__":
    unittest.main()
