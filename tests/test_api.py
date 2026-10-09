import os
import unittest

os.environ["DATABASE_URL"] = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql://telecoemprende:telecoemprende@localhost:5432/telecoemprende_test",
)
# `backend.config.CRON_SECRET` se lee una vez, al primer `import app` de toda
# la suite -- fijarlo aquí también (test_cron.py lo repite por si se ejecuta
# solo) para que no dependa de qué archivo de test importa primero.
os.environ["CRON_SECRET"] = "test-cron-secret"
os.environ["SLACK_SIGNING_SECRET"] = "test-signing-secret"

import app  # noqa: E402
import backend.services.equipo as equipo_service  # noqa: E402
import backend.services.marketing as marketing_service  # noqa: E402
import backend.services.registrations as registration_service  # noqa: E402
import backend.services.security as security_service  # noqa: E402
from backend.config import MAX_LOGIN_ATTEMPTS_PER_WINDOW  # noqa: E402
from openpyxl import load_workbook  # noqa: E402
from werkzeug.security import generate_password_hash  # noqa: E402


class ApiTestCase(unittest.TestCase):
    def setUp(self):
        security_service.request_log.clear()

        registration_service.init_db()
        equipo_service.init_equipo_db()

        marketing_service.init_marketing_db()

        conn = registration_service._get_connection()
        with conn.cursor() as cur:
            cur.execute("DELETE FROM registrations")
            cur.execute("DELETE FROM equipo_accesos")
            cur.execute("DELETE FROM calendario_eventos")
            # `tasks` arrastra `contents`/`campaigns` por cascada: sin esto,
            # una tarea creada por un test de /api/marketing/tasks o
            # /api/equipo/mis-tareas (metricas, mis-tareas...) sobrevive al
            # siguiente test de esta clase -- no hay transacción por test.
            cur.execute("DELETE FROM tasks")
            cur.execute("DELETE FROM contents")
            cur.execute("DELETE FROM campaigns")
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
        equipos = equipos or ["marketing"]
        # VP de todos sus equipos por defecto: crear tareas ahora exige
        # VP/board (ver `_puede_asignar_tareas` en backend/api/marketing.py),
        # y la mayoría de estos tests ejercitan ese CRUD, no el límite de
        # permisos en sí.
        vp_de = equipos if vp_de is None else vp_de
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
                    equipos,
                    activo,
                    vp_de,
                    cargo,
                ),
            )
        conn.commit()
        conn.close()

    def equipo_login(self, email="marketing@example.com", password="test-equipo"):
        return self.client.post("/api/equipo/login", json={"email": email, "password": password})

    def register(self, email="juan@alumnos.upm.es", nombre="Juan"):
        # El formulario público ya no existe: las inscripciones que gestiona
        # /admin son las que quedaron en la tabla, así que se siembran a mano.
        conn = registration_service._get_connection()
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO registrations
                    (nombre, apellidos, escuela, nivel, estudios, email, telefono,
                     departamento, drive_link, privacidad_aceptada, ip_registro, evento)
                VALUES (%s, 'Perez', 'ETSIT', 'Grado', 'Grado - Test', %s, '600123456',
                        'Tech/Ingeniería', 'https://drive.google.com/file/d/test', 'Sí',
                        '127.0.0.1', 'telecoemprende-2026-27')
                """,
                (nombre, email),
            )
        conn.commit()
        conn.close()

    def login(self):
        """Sesión de admin tal cual la deja el login de /equipo de alguien de
        Ingeniería o del board (ver login_equipo): ya no hay contraseña
        maestra."""
        with self.client.session_transaction() as s:
            s.clear()
            s["admin_auth"] = True

    def test_admin_password_login_no_longer_exists(self):
        response = self.client.post("/api/admin/login", json={"password": "x"})
        self.assertEqual(response.status_code, 404)

    def test_admin_session_login_and_registrations_flow(self):
        self.register()

        session_before = self.client.get("/api/admin/session")
        self.login()
        session_after = self.client.get("/api/admin/session")
        registrations = self.client.get("/api/admin/registrations")

        self.assertEqual(session_before.status_code, 200)
        self.assertFalse(session_before.get_json()["authenticated"])
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
        self.register(email="formula@alumnos.upm.es", nombre="=cmd|'/c calc'!A1")
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

    def test_equipo_login_ingenieria_does_not_grant_admin(self):
        self.seed_equipo(email="dev@example.com", equipos=["ingenieria", "marketing"])

        response = self.equipo_login(email="dev@example.com")
        self.assertFalse(response.get_json()["admin"])

        admin_session = self.client.get("/api/admin/session")
        self.assertFalse(admin_session.get_json()["authenticated"])

    def test_equipo_login_es_admin_grants_admin_session(self):
        self.seed_equipo(email="admin@example.com", equipos=["marketing", "eventos"])
        conn = registration_service._get_connection()
        with conn.cursor() as cur:
            cur.execute("UPDATE equipo_accesos SET es_admin = TRUE WHERE email = 'admin@example.com'")
        conn.commit()
        conn.close()

        response = self.equipo_login(email="admin@example.com")
        self.assertTrue(response.get_json()["admin"])
        self.assertTrue(self.client.get("/api/admin/session").get_json()["authenticated"])
        self.assertTrue(self.client.get("/api/equipo/session").get_json()["admin"])

    def test_admin_equipo_requires_two_departments_in_preference_order(self):
        self.login()
        base = {"password": "contrasena-larga"}

        uno = self.client.post("/api/admin/equipo", json={**base, "email": "a@example.com", "equipos": ["eventos"]})
        self.assertEqual(uno.status_code, 400)
        repetido = self.client.post(
            "/api/admin/equipo", json={**base, "email": "a@example.com", "equipos": ["eventos", "eventos"]}
        )
        self.assertEqual(repetido.status_code, 400)

        dos = self.client.post(
            "/api/admin/equipo", json={**base, "email": "a@example.com", "equipos": ["marketing", "eventos"]}
        )
        self.assertEqual(dos.status_code, 201)
        self.assertEqual(dos.get_json()["acceso"]["equipos"], ["marketing", "eventos"])

    def test_admin_equipo_sets_photo_and_rejects_non_images(self):
        self.login()
        self.seed_equipo(email="foto@example.com", equipos=["marketing", "eventos"])
        acceso_id = next(
            a["id"] for a in self.client.get("/api/admin/equipo").get_json()["accesos"]
            if a["email"] == "foto@example.com"
        )
        png = (
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4"
            "nGNgYGD4DwABBAEAwS2OUAAAAABJRU5ErkJggg=="
        )

        malo = self.client.put(f"/api/admin/equipo/{acceso_id}", json={"foto": "data:text/html;base64,PHA+"})
        self.assertEqual(malo.status_code, 400)
        bueno = self.client.put(f"/api/admin/equipo/{acceso_id}", json={"foto": png})
        self.assertEqual(bueno.status_code, 200)
        guardado = next(
            a for a in self.client.get("/api/admin/equipo").get_json()["accesos"] if a["id"] == acceso_id
        )
        self.assertEqual(guardado["foto"], png)

    def test_admin_cannot_remove_own_admin(self):
        self.seed_equipo(email="yo@example.com", equipos=["marketing", "eventos"])
        conn = registration_service._get_connection()
        with conn.cursor() as cur:
            cur.execute("UPDATE equipo_accesos SET es_admin = TRUE WHERE email = 'yo@example.com' RETURNING id")
            acceso_id = cur.fetchone()[0]
        conn.commit()
        conn.close()
        self.equipo_login(email="yo@example.com")

        response = self.client.put(f"/api/admin/equipo/{acceso_id}", json={"es_admin": False})
        self.assertEqual(response.status_code, 400)

    def test_equipo_login_presidente_cargo_does_not_grant_admin(self):
        self.seed_equipo(email="presi@example.com", equipos=["eventos"], cargo="presidente")

        response = self.equipo_login(email="presi@example.com")
        body = response.get_json()
        self.assertTrue(body["ok"])
        self.assertEqual(body["cargo"], "presidente")

        # El cargo es un título: el admin se da aparte (`es_admin`).
        admin_session = self.client.get("/api/admin/session")
        self.assertFalse(admin_session.get_json()["authenticated"])

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

    def test_admin_cambia_el_email_de_una_cuenta(self):
        self.login()
        self.seed_equipo(email="provisional@example.com", equipos=["marketing"])
        self.seed_equipo(email="otra@example.com", equipos=["marketing"])
        acceso_id = next(
            a["id"] for a in equipo_service.listar_equipo_accesos()
            if a["email"] == "provisional@example.com"
        )

        choque = self.client.put(f"/api/admin/equipo/{acceso_id}", json={"email": "otra@example.com"})
        self.assertEqual(choque.status_code, 409)
        malo = self.client.put(f"/api/admin/equipo/{acceso_id}", json={"email": "sin-arroba"})
        self.assertEqual(malo.status_code, 400)

        bueno = self.client.put(f"/api/admin/equipo/{acceso_id}", json={"email": "Real@Example.com"})
        self.assertEqual(bueno.status_code, 200)
        self.assertIn("real@example.com", [a["email"] for a in equipo_service.listar_equipo_accesos()])

    def test_la_cuenta_se_vincula_sola_a_su_inscripcion_por_email(self):
        self.login()
        conn = equipo_service._get_connection()
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO registrations (nombre, apellidos, estudios, email, drive_link,"
                " privacidad_aceptada, ip_registro, evento, departamento)"
                " VALUES ('Ana', 'García', 'GISD', 'ana@alumnos.upm.es', 'https://drive.google.com/x',"
                " TRUE, '127.0.0.1', 'telecoemprende-2026-27', 'Marketing') RETURNING id"
            )
            registro_id = cur.fetchone()[0]
        conn.commit()
        conn.close()
        self.seed_equipo(email="ana@alumnos.upm.es", equipos=["marketing"])

        equipo_service.init_equipo_db()
        ana = next(a for a in equipo_service.listar_equipo_accesos() if a["email"] == "ana@alumnos.upm.es")
        self.assertEqual(ana["registro_id"], registro_id)

        # Y a mano, para quien se inscribió con otro correo; 0 desvincula.
        self.client.put(f"/api/admin/equipo/{ana['id']}", json={"registro_id": 0})
        ana = next(a for a in equipo_service.listar_equipo_accesos() if a["email"] == "ana@alumnos.upm.es")
        self.assertIsNone(ana["registro_id"])

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

    def test_confirmar_evento_se_apunta_y_se_puede_quitar(self):
        self.login()
        evento_id = self.client.post(
            "/api/admin/calendario",
            json={"titulo": "Demo Day", "descripcion": "", "fecha": "2026-10-24", "hora": "17:00"},
        ).get_json()["evento"]["id"]
        self.client.post("/api/admin/logout")

        self.seed_equipo(email="voy@example.com")
        self.equipo_login(email="voy@example.com")

        confirmar = self.client.post(f"/api/equipo/calendario/{evento_id}/confirmar", json={})
        self.assertEqual(confirmar.status_code, 200)
        eventos = self.client.get("/api/equipo/calendario").get_json()["eventos"]
        evento = next(e for e in eventos if e["id"] == evento_id)
        self.assertEqual(evento["confirmados"], ["voy@example.com"])

        quitar = self.client.post(
            f"/api/equipo/calendario/{evento_id}/confirmar", json={"confirmar": False}
        )
        self.assertEqual(quitar.status_code, 200)
        eventos = self.client.get("/api/equipo/calendario").get_json()["eventos"]
        evento = next(e for e in eventos if e["id"] == evento_id)
        self.assertEqual(evento["confirmados"], [])

    def test_checkin_requiere_ser_vp_o_admin(self):
        self.login()
        evento_id = self.client.post(
            "/api/admin/calendario",
            json={"titulo": "Demo Day", "descripcion": "", "fecha": "2026-10-24", "hora": "17:00"},
        ).get_json()["evento"]["id"]
        self.client.post("/api/admin/logout")

        self.seed_equipo(email="raso@example.com", vp_de=[])
        self.equipo_login(email="raso@example.com")

        respuesta = self.client.post(
            f"/api/equipo/calendario/{evento_id}/checkin", json={"email": "raso@example.com"}
        )
        self.assertEqual(respuesta.status_code, 401)

    def test_vp_hace_checkin_y_alimenta_asistencia(self):
        self.login()
        evento_id = self.client.post(
            "/api/admin/calendario",
            json={"titulo": "Demo Day", "descripcion": "", "fecha": "2026-10-24", "hora": "17:00"},
        ).get_json()["evento"]["id"]
        self.client.post("/api/admin/logout")

        self.seed_equipo(email="vp@example.com", vp_de=["marketing"])
        self.equipo_login(email="vp@example.com")

        checkin = self.client.post(
            f"/api/equipo/calendario/{evento_id}/checkin", json={"email": "asistio@example.com"}
        )
        self.assertEqual(checkin.status_code, 200)
        eventos = self.client.get("/api/equipo/calendario").get_json()["eventos"]
        evento = next(e for e in eventos if e["id"] == evento_id)
        self.assertEqual(evento["asistio"], ["asistio@example.com"])

    def test_mis_proyectos_requiere_sesion(self):
        self.assertEqual(self.client.get("/api/equipo/mis-proyectos").status_code, 401)

    def test_mis_proyectos_junta_departamentos_con_progreso(self):
        self.seed_equipo(equipos=["marketing", "eventos"])
        self.equipo_login()

        campaign_id = self.client.post(
            "/api/marketing/campaigns", json={"nombre": "Demo Day octubre"}
        ).get_json()["campaign"]["id"]
        tarea_id = self.client.post(
            "/api/marketing/tasks",
            json={
                "titulo": "Cerrar sala", "instrucciones": "Ver notas.",
                "campaign_id": campaign_id, "responsables": ["marketing@example.com"],
            },
        ).get_json()["task"]["id"]
        self.client.put(f"/api/marketing/tasks/{tarea_id}", json={"estado": "acabado"})

        respuesta = self.client.get("/api/equipo/mis-proyectos")
        self.assertEqual(respuesta.status_code, 200)
        proyectos = respuesta.get_json()["proyectos"]
        self.assertEqual(len(proyectos), 1)
        self.assertEqual(proyectos[0]["nombre"], "Demo Day octubre")
        self.assertEqual(proyectos[0]["total_tasks"], 1)
        self.assertEqual(proyectos[0]["tareas_acabadas"], 1)

    def test_mis_tareas_requiere_sesion(self):
        self.assertEqual(self.client.get("/api/equipo/mis-tareas").status_code, 401)

    def test_mis_tareas_junta_departamentos_y_omite_las_acabadas(self):
        self.seed_equipo(equipos=["marketing", "eventos"])
        self.equipo_login()

        self.client.post(
            "/api/marketing/tasks",
            json={
                "titulo": "Guion", "instrucciones": "Ver notas.",
                "responsables": ["marketing@example.com"],
            },
        )
        self.client.post(
            "/api/eventos/tasks",
            json={
                "titulo": "Reservar sala", "instrucciones": "Ver notas.",
                "responsables": ["marketing@example.com"],
            },
        )
        self.client.post(
            "/api/marketing/tasks",
            json={
                "titulo": "Ya acabada", "instrucciones": "Ver notas.", "estado": "acabado",
                "responsables": ["marketing@example.com"],
            },
        )
        self.client.post(
            "/api/marketing/tasks",
            json={
                "titulo": "De otra persona", "instrucciones": "Ver notas.",
                "responsables": ["hugo@example.com"],
            },
        )

        respuesta = self.client.get("/api/equipo/mis-tareas")
        self.assertEqual(respuesta.status_code, 200)
        titulos = {t["titulo"] for t in respuesta.get_json()["tareas"]}
        self.assertEqual(titulos, {"Guion", "Reservar sala"})

    def test_metricas_requiere_sesion(self):
        self.assertEqual(self.client.get("/api/equipo/metricas").status_code, 401)

    def test_metricas_rechaza_a_quien_no_es_board_ni_vp(self):
        self.seed_equipo(vp_de=[])
        self.equipo_login()
        self.assertEqual(self.client.get("/api/equipo/metricas").status_code, 403)

    def test_metricas_cuenta_tareas_completadas_por_persona(self):
        """La productividad sale de `tasks` real, no de un número inventado:
        una tarea cerrada por alguien cuenta en su fila."""
        self.seed_equipo(vp_de=["marketing"])
        self.equipo_login()

        creada = self.client.post(
            "/api/marketing/tasks",
            json={
                "titulo": "Guion", "instrucciones": "Ver notas.",
                "responsables": ["marketing@example.com"],
            },
        ).get_json()["task"]
        self.client.put(
            f"/api/marketing/tasks/{creada['id']}", json={"estado": "acabado"}
        )
        self.client.post(
            "/api/marketing/tasks",
            json={
                "titulo": "Aún abierta", "instrucciones": "Ver notas.",
                "responsables": ["marketing@example.com"],
            },
        )

        respuesta = self.client.get("/api/equipo/metricas")
        self.assertEqual(respuesta.status_code, 200)
        metricas = respuesta.get_json()["metricas"]
        self.assertEqual(metricas["total_activos"], 1)

        yo = next(m for m in metricas["miembros"] if m["email"] == "marketing@example.com")
        self.assertEqual(yo["completadas_periodo"], 1)
        self.assertEqual(yo["abiertas"], 1)
        self.assertIn("marketing", metricas["por_departamento"])

    def test_directorio_requiere_sesion(self):
        self.assertEqual(self.client.get("/api/equipo/directorio").status_code, 401)

    def test_directorio_lo_ve_cualquier_miembro_y_omite_privados(self):
        """"Quién es quién" no es board/VP-only como /metricas: cualquiera con
        sesión de equipo lo ve, y solo trae lo básico (nada de notas)."""
        self.seed_equipo()
        self.seed_equipo(email="otra@example.com", equipos=["eventos"], cargo="boardmember")
        self.equipo_login()

        respuesta = self.client.get("/api/equipo/directorio")
        self.assertEqual(respuesta.status_code, 200)
        miembros = respuesta.get_json()["miembros"]
        self.assertEqual({m["email"] for m in miembros}, {"marketing@example.com", "otra@example.com"})
        self.assertNotIn("notas", miembros[0])

    def test_admin_equipo_endpoints_require_auth(self):
        self.assertEqual(self.client.get("/api/admin/equipo").status_code, 401)
        self.assertEqual(self.client.post("/api/admin/equipo", json={}).status_code, 401)
        self.assertEqual(self.client.put("/api/admin/equipo/1", json={}).status_code, 401)
        self.assertEqual(self.client.delete("/api/admin/equipo/1").status_code, 401)

    def test_admin_equipo_pdf_requires_auth_and_returns_file_when_authenticated(self):
        unauthorized = self.client.get("/api/admin/equipo/pdf")
        self.assertEqual(unauthorized.status_code, 401)

        self.seed_equipo(email="pdf@example.com")
        self.login()
        authorized = self.client.get("/api/admin/equipo/pdf")

        self.assertEqual(authorized.status_code, 200)
        self.assertEqual(authorized.mimetype, "application/pdf")
        self.assertIn(
            "attachment; filename=miembros_equipo.pdf",
            authorized.headers["Content-Disposition"],
        )
        self.assertTrue(authorized.data.startswith(b"%PDF"))
        authorized.close()

    def test_admin_equipo_crud_flow(self):
        self.login()

        create = self.client.post(
            "/api/admin/equipo",
            json={
                "email": "nueva@example.com", "password": "contrasena-larga",
                "equipos": ["eventos", "ingenieria"],
            },
        )
        self.assertEqual(create.status_code, 201)
        acceso_id = create.get_json()["acceso"]["id"]

        listado = self.client.get("/api/admin/equipo")
        emails = [a["email"] for a in listado.get_json()["accesos"]]
        self.assertIn("nueva@example.com", emails)

        update = self.client.put(
            f"/api/admin/equipo/{acceso_id}",
            json={
                "equipos": ["eventos", "marketing"],
                "activo": False,
                "dni": "12345678Z",
                "correo_personal": "nueva.personal@gmail.com",
                "apellidos": "García López",
            },
        )
        self.assertEqual(update.status_code, 200)

        listado_tras_update = self.client.get("/api/admin/equipo").get_json()["accesos"]
        actualizado = next(a for a in listado_tras_update if a["id"] == acceso_id)
        # El orden es la preferencia: se guarda tal cual, sin ordenar.
        self.assertEqual(actualizado["equipos"], ["eventos", "marketing"])
        self.assertFalse(actualizado["activo"])
        self.assertEqual(actualizado["dni"], "12345678Z")
        self.assertEqual(actualizado["apellidos"], "García López")
        self.assertEqual(actualizado["correo_personal"], "nueva.personal@gmail.com")

        delete = self.client.delete(f"/api/admin/equipo/{acceso_id}")
        self.assertEqual(delete.status_code, 200)

        listado_final = self.client.get("/api/admin/equipo").get_json()["accesos"]
        self.assertNotIn(acceso_id, [a["id"] for a in listado_final])

    def test_admin_equipo_create_rejects_duplicate_email(self):
        self.login()
        self.seed_equipo(email="ya-existe@example.com")

        response = self.client.post(
            "/api/admin/equipo",
            json={
                "email": "ya-existe@example.com", "password": "contrasena-larga",
                "equipos": ["marketing", "eventos"],
            },
        )
        self.assertEqual(response.status_code, 409)

    def test_admin_equipo_create_board_member_without_team(self):
        """Board sin departamento es válido; el admin va aparte del cargo."""
        self.login()

        create = self.client.post(
            "/api/admin/equipo",
            json={
                "email": "board@example.com",
                "password": "contrasena-larga",
                "equipos": [],
                "cargo": "boardmember",
                "es_admin": True,
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
        # Sin ningún equipo, el permiso de admin tiene que seguir abriendo Admin.
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
