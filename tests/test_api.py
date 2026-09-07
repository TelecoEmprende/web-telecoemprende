import os
import unittest

os.environ["ADMIN_PASSWORD"] = "test-admin"
os.environ["DATABASE_URL"] = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql://telecoemprende:telecoemprende@localhost:5432/telecoemprende_test",
)

import app  # noqa: E402
import backend.services.admin as admin_service  # noqa: E402
import backend.services.equipo as equipo_service  # noqa: E402
import backend.services.registrations as registration_service  # noqa: E402
import backend.services.security as security_service  # noqa: E402
from backend.config import MAX_LOGIN_ATTEMPTS_PER_WINDOW  # noqa: E402
from openpyxl import load_workbook  # noqa: E402
from werkzeug.security import generate_password_hash  # noqa: E402


class ApiTestCase(unittest.TestCase):
    def setUp(self):
        admin_service.ADMIN_PASSWORD = "test-admin"
        security_service.request_log.clear()

        registration_service.init_db()
        equipo_service.init_equipo_db()

        conn = registration_service._get_connection()
        with conn.cursor() as cur:
            cur.execute("DELETE FROM registrations")
            cur.execute("DELETE FROM equipo_accesos")
            cur.execute("DELETE FROM calendario_eventos")
        conn.commit()
        conn.close()

        self.client = app.app.test_client()

    def seed_equipo(
        self,
        email="marketing@example.com",
        password="test-equipo",
        equipos=None,
        activo=True,
        vp_de=None,
        cargo="",
    ):
        conn = registration_service._get_connection()
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO equipo_accesos (email, password_hash, equipos, activo, vp_de, cargo)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (
                    email,
                    generate_password_hash(password),
                    equipos or ["marketing"],
                    activo,
                    vp_de or [],
                    cargo,
                ),
            )
        conn.commit()
        conn.close()

    def equipo_login(self, email="marketing@example.com", password="test-equipo"):
        return self.client.post("/api/equipo/login", json={"email": email, "password": password})

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

    def test_admin_login_rate_limited_after_repeated_failures(self):
        for _ in range(MAX_LOGIN_ATTEMPTS_PER_WINDOW):
            attempt = self.login(password="wrong-password")
            self.assertEqual(attempt.status_code, 401)

        blocked = self.login(password="wrong-password")
        self.assertEqual(blocked.status_code, 429)

        # Un intento correcto tras agotar el cupo también debe quedar bloqueado.
        still_blocked = self.login()
        self.assertEqual(still_blocked.status_code, 429)

    def test_admin_login_uses_its_own_rate_limit_bucket(self):
        # Agotar el cupo de /api/registrations no debe bloquear el login:
        # cada endpoint sensible tiene su propio contador por IP.
        from backend.config import MAX_REQUESTS_PER_MINUTE

        for _ in range(MAX_REQUESTS_PER_MINUTE):
            self.register()

        login = self.login()
        self.assertEqual(login.status_code, 200)

    def test_admin_update_rejects_invalid_departamento(self):
        self.register()
        self.login()
        registrations = self.client.get("/api/admin/registrations").get_json()
        reg_id = registrations["registros"][0]["id"]

        response = self.client.put(
            f"/api/admin/registrations/{reg_id}",
            json={
                "nombre": "Juan",
                "apellidos": "Perez",
                "escuela": "ETSIT",
                "nivel": "Grado",
                "estudios": "Grado - Test",
                "email": "juan@alumnos.upm.es",
                "telefono": "600123456",
                "departamento": "No Existe",
                "drive_link": "https://drive.google.com/file/d/test",
            },
        )

        self.assertEqual(response.status_code, 400)

    def test_admin_update_rejects_non_upm_email(self):
        self.register()
        self.login()
        registrations = self.client.get("/api/admin/registrations").get_json()
        reg_id = registrations["registros"][0]["id"]

        response = self.client.put(
            f"/api/admin/registrations/{reg_id}",
            json={
                "nombre": "Juan",
                "apellidos": "Perez",
                "escuela": "ETSIT",
                "nivel": "Grado",
                "estudios": "Grado - Test",
                "email": "juan@gmail.com",
                "telefono": "600123456",
                "departamento": "Tech/Ingeniería",
                "drive_link": "https://drive.google.com/file/d/test",
            },
        )

        self.assertEqual(response.status_code, 400)

    def test_admin_update_rejects_invalid_telefono(self):
        self.register()
        self.login()
        registrations = self.client.get("/api/admin/registrations").get_json()
        reg_id = registrations["registros"][0]["id"]

        response = self.client.put(
            f"/api/admin/registrations/{reg_id}",
            json={
                "nombre": "Juan",
                "apellidos": "Perez",
                "escuela": "ETSIT",
                "nivel": "Grado",
                "estudios": "Grado - Test",
                "email": "juan@alumnos.upm.es",
                "telefono": "no-es-un-telefono",
                "departamento": "Tech/Ingeniería",
                "drive_link": "https://drive.google.com/file/d/test",
            },
        )

        self.assertEqual(response.status_code, 400)

    def test_admin_update_estado_flow(self):
        self.register()
        self.login()
        registrations = self.client.get("/api/admin/registrations").get_json()
        reg = registrations["registros"][0]
        self.assertEqual(reg["estado"], "pendiente")
        self.assertFalse(reg["notificado"])

        response = self.client.patch(
            f"/api/admin/registrations/{reg['id']}/estado",
            json={"estado": "aceptado"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.get_json()["ok"])

        registrations = self.client.get("/api/admin/registrations").get_json()
        self.assertEqual(registrations["registros"][0]["estado"], "aceptado")
        # Clasificar no envía el email por sí solo: hace falta el botón "Enviar".
        self.assertFalse(registrations["registros"][0]["notificado"])

    def test_admin_notificar_sends_only_pending_and_marks_notificado(self):
        self.register()
        self.login()
        reg_id = self.client.get("/api/admin/registrations").get_json()["registros"][0]["id"]
        self.client.patch(f"/api/admin/registrations/{reg_id}/estado", json={"estado": "aceptado"})

        response = self.client.post("/api/admin/registrations/notificar", json={"estado": "aceptado"})
        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["total"], 1)
        self.assertEqual(payload["enviados"], 0)  # sin RESEND_API_KEY en tests, Resend no llega a llamarse

        # Sin RESEND_API_KEY el envío falla y notificado sigue en False (para poder reintentar).
        registrations = self.client.get("/api/admin/registrations").get_json()
        self.assertFalse(registrations["registros"][0]["notificado"])

        # Un segundo intento vuelve a considerarlo pendiente (no se marcó como enviado).
        response = self.client.post("/api/admin/registrations/notificar", json={"estado": "aceptado"})
        self.assertEqual(response.get_json()["total"], 1)

    def test_admin_notificar_rejects_pendiente(self):
        self.register()
        self.login()
        response = self.client.post("/api/admin/registrations/notificar", json={"estado": "pendiente"})
        self.assertEqual(response.status_code, 400)

    def test_admin_notificar_requires_auth(self):
        self.register()
        response = self.client.post("/api/admin/registrations/notificar", json={"estado": "aceptado"})
        self.assertEqual(response.status_code, 401)

    def test_admin_update_estado_rejects_invalid_value(self):
        self.register()
        self.login()
        registrations = self.client.get("/api/admin/registrations").get_json()
        reg_id = registrations["registros"][0]["id"]

        response = self.client.patch(
            f"/api/admin/registrations/{reg_id}/estado",
            json={"estado": "no-es-un-estado"},
        )
        self.assertEqual(response.status_code, 400)

    def test_admin_update_estado_requires_auth(self):
        self.register()
        self.login()
        registrations = self.client.get("/api/admin/registrations").get_json()
        reg_id = registrations["registros"][0]["id"]
        self.client.post("/api/admin/logout")

        response = self.client.patch(
            f"/api/admin/registrations/{reg_id}/estado",
            json={"estado": "aceptado"},
        )
        self.assertEqual(response.status_code, 401)

    def test_legacy_get_admin_logout_route_removed(self):
        # Era alcanzable con una navegación GET de nivel superior (cross-site),
        # forzando el logout del admin sin su intención. El logout real vive
        # únicamente en POST /api/admin/logout.
        response = self.client.get("/admin/logout")
        self.assertEqual(response.status_code, 404)

    def test_admin_update_requires_auth(self):
        self.register()
        self.login()
        registrations_as_admin = self.client.get("/api/admin/registrations").get_json()
        reg_id = registrations_as_admin["registros"][0]["id"]
        self.client.post("/api/admin/logout")

        response = self.client.put(
            f"/api/admin/registrations/{reg_id}",
            json={
                "nombre": "Hackeado",
                "apellidos": "Perez",
                "escuela": "ETSIT",
                "nivel": "Grado",
                "estudios": "Grado - Test",
                "email": "juan@alumnos.upm.es",
                "telefono": "600123456",
                "departamento": "Tech/Ingeniería",
                "drive_link": "https://drive.google.com/file/d/test",
            },
        )

        self.assertEqual(response.status_code, 401)

    def test_excel_export_neutralizes_formula_injection(self):
        self.client.post(
            "/api/registrations",
            json={
                "nombre": "=cmd|'/c calc'!A1",
                "apellidos": "Perez",
                "escuela": "ETSIT",
                "nivel": "Grado",
                "estudios": "Grado - Test",
                "email": "formula@alumnos.upm.es",
                "telefono": "600123456",
                "departamento": "Tech/Ingeniería",
                "drive_link": "https://drive.google.com/file/d/formula",
                "privacidad": True,
                "evento": "telecoemprende-2026-27",
                "telefono_oculto": "",
            },
        )
        self.login()

        excel_bytes = registration_service.generar_excel_en_memoria()
        wb = load_workbook(excel_bytes)
        ws = wb.active
        nombre_cell = ws.cell(row=2, column=1).value

        self.assertFalse(nombre_cell.startswith("="))
        self.assertTrue(nombre_cell.startswith("'"))

    def test_equipo_login_session_logout_flow(self):
        self.seed_equipo(equipos=["marketing", "eventos"])

        session_before = self.client.get("/api/equipo/session")
        self.assertEqual(session_before.status_code, 200)
        self.assertFalse(session_before.get_json()["authenticated"])
        self.assertEqual(session_before.get_json()["teams"], [])

        login = self.equipo_login()
        self.assertEqual(login.status_code, 200)
        self.assertEqual(sorted(login.get_json()["teams"]), ["eventos", "marketing"])

        session_after = self.client.get("/api/equipo/session")
        self.assertTrue(session_after.get_json()["authenticated"])
        self.assertEqual(sorted(session_after.get_json()["teams"]), ["eventos", "marketing"])

        logout = self.client.post("/api/equipo/logout")
        self.assertEqual(logout.status_code, 200)
        session_out = self.client.get("/api/equipo/session")
        self.assertFalse(session_out.get_json()["authenticated"])
        self.assertEqual(session_out.get_json()["teams"], [])

    def test_equipo_login_wrong_password(self):
        self.seed_equipo()

        response = self.equipo_login(password="wrong-password")
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.get_json()["message"], "Credenciales incorrectas.")

    def test_equipo_login_unknown_email(self):
        response = self.equipo_login(email="no-existe@example.com")
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.get_json()["message"], "Credenciales incorrectas.")

    def test_equipo_login_inactive_account_rejected(self):
        self.seed_equipo(activo=False)

        response = self.equipo_login()
        self.assertEqual(response.status_code, 401)

    def test_equipo_login_rate_limited_after_repeated_failures(self):
        self.seed_equipo()

        for _ in range(MAX_LOGIN_ATTEMPTS_PER_WINDOW):
            attempt = self.equipo_login(password="wrong-password")
            self.assertEqual(attempt.status_code, 401)

        blocked = self.equipo_login(password="wrong-password")
        self.assertEqual(blocked.status_code, 429)

        # Un intento correcto tras agotar el cupo también debe quedar bloqueado.
        still_blocked = self.equipo_login()
        self.assertEqual(still_blocked.status_code, 429)

    def test_equipo_login_uses_its_own_rate_limit_bucket(self):
        # Agotar el cupo del login de admin no debe bloquear el de equipo:
        # cada endpoint sensible tiene su propio contador por IP.
        self.seed_equipo()
        for _ in range(MAX_LOGIN_ATTEMPTS_PER_WINDOW):
            self.login(password="wrong-password")

        response = self.equipo_login()
        self.assertEqual(response.status_code, 200)

    def test_equipo_login_admin_session_mutually_exclusive(self):
        # session.clear() en login_equipo/login_admin: no pueden coexistir
        # una sesión admin y una de equipo en el mismo navegador.
        self.seed_equipo()
        self.login()
        self.equipo_login()

        admin_session = self.client.get("/api/admin/session")
        self.assertFalse(admin_session.get_json()["authenticated"])

    def test_equipo_login_ingenieria_grants_admin_session(self):
        self.seed_equipo(email="dev@example.com", equipos=["ingenieria"])

        response = self.equipo_login(email="dev@example.com")
        self.assertTrue(response.get_json()["ok"])

        admin_session = self.client.get("/api/admin/session")
        self.assertTrue(admin_session.get_json()["authenticated"])

    def test_equipo_login_presidente_cargo_grants_admin_session(self):
        self.seed_equipo(email="presi@example.com", equipos=["eventos"], cargo="presidente")

        response = self.equipo_login(email="presi@example.com")
        body = response.get_json()
        self.assertTrue(body["ok"])
        self.assertEqual(body["cargo"], "presidente")

        admin_session = self.client.get("/api/admin/session")
        self.assertTrue(admin_session.get_json()["authenticated"])

    def test_equipo_login_regular_member_does_not_grant_admin(self):
        self.seed_equipo(email="miembro@example.com", equipos=["marketing"])

        self.equipo_login(email="miembro@example.com")

        admin_session = self.client.get("/api/admin/session")
        self.assertFalse(admin_session.get_json()["authenticated"])

    def test_equipo_login_reports_vp_de(self):
        self.seed_equipo(email="vp@example.com", equipos=["marketing", "eventos"], vp_de=["marketing"])

        response = self.equipo_login(email="vp@example.com")
        self.assertEqual(response.get_json()["vp_de"], ["marketing"])

    def test_admin_equipo_create_rejects_vp_de_outside_equipos(self):
        self.login()

        response = self.client.post(
            "/api/admin/equipo",
            json={
                "email": "malo@example.com",
                "password": "contrasena-larga",
                "equipos": ["marketing"],
                "vp_de": ["eventos"],
            },
        )
        self.assertEqual(response.status_code, 400)

    def test_admin_equipo_create_rejects_invalid_cargo(self):
        self.login()

        response = self.client.post(
            "/api/admin/equipo",
            json={
                "email": "malo2@example.com",
                "password": "contrasena-larga",
                "equipos": ["marketing"],
                "cargo": "no-existe",
            },
        )
        self.assertEqual(response.status_code, 400)

    def test_admin_equipo_create_with_vp_and_cargo(self):
        self.login()

        create = self.client.post(
            "/api/admin/equipo",
            json={
                "email": "vp2@example.com",
                "password": "contrasena-larga",
                "equipos": ["eventos", "marketing"],
                "vp_de": ["eventos"],
                "cargo": "boardmember",
            },
        )
        self.assertEqual(create.status_code, 201)
        acceso = create.get_json()["acceso"]
        self.assertEqual(acceso["vp_de"], ["eventos"])
        self.assertEqual(acceso["cargo"], "boardmember")

    def test_admin_calendario_endpoints_require_auth(self):
        self.assertEqual(self.client.get("/api/admin/calendario").status_code, 401)
        self.assertEqual(self.client.post("/api/admin/calendario", json={}).status_code, 401)
        self.assertEqual(self.client.put("/api/admin/calendario/1", json={}).status_code, 401)
        self.assertEqual(self.client.delete("/api/admin/calendario/1").status_code, 401)

    def test_admin_calendario_crud_flow(self):
        self.login()

        create = self.client.post(
            "/api/admin/calendario",
            json={
                "titulo": "Reunión de equipo",
                "descripcion": "Kickoff del curso",
                "fecha": "2026-10-01",
                "hora": "18:30",
            },
        )
        self.assertEqual(create.status_code, 201)
        evento_id = create.get_json()["evento"]["id"]

        listado = self.client.get("/api/admin/calendario")
        titulos = [e["titulo"] for e in listado.get_json()["eventos"]]
        self.assertIn("Reunión de equipo", titulos)

        update = self.client.put(
            f"/api/admin/calendario/{evento_id}",
            json={
                "titulo": "Reunión de equipo (actualizada)",
                "descripcion": "",
                "fecha": "2026-10-02",
                "hora": "",
            },
        )
        self.assertEqual(update.status_code, 200)

        delete = self.client.delete(f"/api/admin/calendario/{evento_id}")
        self.assertEqual(delete.status_code, 200)

        listado_final = self.client.get("/api/admin/calendario").get_json()["eventos"]
        self.assertNotIn(evento_id, [e["id"] for e in listado_final])

    def test_admin_calendario_rejects_invalid_fecha(self):
        self.login()

        response = self.client.post(
            "/api/admin/calendario",
            json={"titulo": "X", "descripcion": "", "fecha": "01-10-2026", "hora": ""},
        )
        self.assertEqual(response.status_code, 400)

    def test_equipo_calendario_requires_equipo_auth(self):
        self.assertEqual(self.client.get("/api/equipo/calendario").status_code, 401)

    def test_equipo_calendario_visible_to_logged_in_member(self):
        self.login()
        self.client.post(
            "/api/admin/calendario",
            json={"titulo": "Charla", "descripcion": "", "fecha": "2026-11-05", "hora": "17:00"},
        )
        self.client.post("/api/admin/logout")

        self.seed_equipo()
        self.equipo_login()

        response = self.client.get("/api/equipo/calendario")
        self.assertEqual(response.status_code, 200)
        titulos = [e["titulo"] for e in response.get_json()["eventos"]]
        self.assertIn("Charla", titulos)

    def test_admin_equipo_endpoints_require_auth(self):
        self.assertEqual(self.client.get("/api/admin/equipo").status_code, 401)
        self.assertEqual(self.client.post("/api/admin/equipo", json={}).status_code, 401)
        self.assertEqual(self.client.put("/api/admin/equipo/1", json={}).status_code, 401)
        self.assertEqual(self.client.delete("/api/admin/equipo/1").status_code, 401)

    def test_admin_equipo_crud_flow(self):
        self.login()

        create = self.client.post(
            "/api/admin/equipo",
            json={"email": "nueva@example.com", "password": "contrasena-larga", "equipos": ["eventos"]},
        )
        self.assertEqual(create.status_code, 201)
        acceso_id = create.get_json()["acceso"]["id"]

        listado = self.client.get("/api/admin/equipo")
        emails = [a["email"] for a in listado.get_json()["accesos"]]
        self.assertIn("nueva@example.com", emails)

        update = self.client.put(
            f"/api/admin/equipo/{acceso_id}",
            json={"equipos": ["eventos", "marketing"], "activo": False},
        )
        self.assertEqual(update.status_code, 200)

        listado_tras_update = self.client.get("/api/admin/equipo").get_json()["accesos"]
        actualizado = next(a for a in listado_tras_update if a["id"] == acceso_id)
        self.assertEqual(sorted(actualizado["equipos"]), ["eventos", "marketing"])
        self.assertFalse(actualizado["activo"])

        delete = self.client.delete(f"/api/admin/equipo/{acceso_id}")
        self.assertEqual(delete.status_code, 200)

        listado_final = self.client.get("/api/admin/equipo").get_json()["accesos"]
        self.assertNotIn(acceso_id, [a["id"] for a in listado_final])

    def test_admin_equipo_create_rejects_duplicate_email(self):
        self.login()
        self.seed_equipo(email="ya-existe@example.com")

        response = self.client.post(
            "/api/admin/equipo",
            json={"email": "ya-existe@example.com", "password": "contrasena-larga", "equipos": ["marketing"]},
        )
        self.assertEqual(response.status_code, 409)

    def test_admin_equipo_create_board_member_without_team(self):
        """Board sin departamento: el cargo por sí solo ya da acceso a /admin."""
        self.login()

        create = self.client.post(
            "/api/admin/equipo",
            json={
                "email": "board@example.com",
                "password": "contrasena-larga",
                "equipos": [],
                "cargo": "boardmember",
            },
        )
        self.assertEqual(create.status_code, 201)

        self.client.post("/api/admin/logout")
        login = self.client.post(
            "/api/equipo/login",
            json={"email": "board@example.com", "password": "contrasena-larga"},
        )
        self.assertEqual(login.status_code, 200)
        self.assertEqual(login.get_json()["teams"], [])
        self.assertEqual(login.get_json()["cargo"], "boardmember")
        # El cargo, sin ningún equipo, tiene que seguir abriendo /admin.
        self.assertEqual(self.client.get("/api/admin/registrations").status_code, 200)

    def test_admin_equipo_create_rejects_no_team_and_no_cargo(self):
        """Sin departamento y sin cargo la cuenta no daría acceso a nada."""
        self.login()

        response = self.client.post(
            "/api/admin/equipo",
            json={"email": "nadie@example.com", "password": "contrasena-larga", "equipos": []},
        )
        self.assertEqual(response.status_code, 400)

    def test_admin_equipo_update_cannot_strip_last_access(self):
        """Quitarle el cargo a un board sin equipos lo dejaría sin acceso."""
        self.login()

        create = self.client.post(
            "/api/admin/equipo",
            json={
                "email": "board2@example.com",
                "password": "contrasena-larga",
                "equipos": [],
                "cargo": "boardmember",
            },
        )
        acceso_id = create.get_json()["acceso"]["id"]

        response = self.client.put(f"/api/admin/equipo/{acceso_id}", json={"cargo": ""})
        self.assertEqual(response.status_code, 404)

    def test_admin_equipo_create_rejects_invalid_team(self):
        self.login()

        response = self.client.post(
            "/api/admin/equipo",
            json={"email": "x@example.com", "password": "contrasena-larga", "equipos": ["no-existe"]},
        )
        self.assertEqual(response.status_code, 400)

    def test_obtener_ip_real_ignores_spoofed_forwarded_header(self):
        with app.app.test_request_context(
            headers={"X-Forwarded-For": "=cmd|not-an-ip, 203.0.113.5"}
        ):
            self.assertEqual(security_service.obtener_ip_real(), "203.0.113.5")

        with app.app.test_request_context(
            headers={"X-Forwarded-For": "not-an-ip-either"}
        ):
            # Sin ningún valor válido en la cadena, cae al remote_addr real.
            self.assertNotEqual(
                security_service.obtener_ip_real(), "not-an-ip-either"
            )


if __name__ == "__main__":
    unittest.main()
