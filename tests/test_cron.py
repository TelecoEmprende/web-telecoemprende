"""Aviso diario de deadlines de mañana, disparado por Vercel Cron.

Sin sesión de por medio: la autorización va en el header Authorization, no
en una cookie de /equipo (ver backend/api/cron.py).
"""

import os
import unittest
from datetime import date, timedelta
from unittest.mock import patch

os.environ["DATABASE_URL"] = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql://telecoemprende:telecoemprende@localhost:5432/telecoemprende_test",
)
os.environ["CRON_SECRET"] = "test-cron-secret"
os.environ["SLACK_SIGNING_SECRET"] = "test-signing-secret"

import app  # noqa: E402
import backend.services.equipo as equipo_service  # noqa: E402
import backend.services.marketing as marketing_service  # noqa: E402
from werkzeug.security import generate_password_hash  # noqa: E402
from backend.services.db import migrar  # noqa: E402


class CronTests(unittest.TestCase):
    def setUp(self):
        migrar()

        conn = marketing_service._get_connection()
        with conn.cursor() as cur:
            cur.execute("DELETE FROM tasks")
            cur.execute("DELETE FROM contents")
            cur.execute("DELETE FROM campaigns")
            cur.execute("DELETE FROM equipo_accesos")
        conn.commit()
        conn.close()

        app.app.config["TESTING"] = True
        self.client = app.app.test_client()

        conn = equipo_service._get_connection()
        with conn.cursor() as cur:
            # vp_de = equipos: crear tareas ahora exige VP/board (ver
            # `_puede_asignar_tareas`), y este test ejercita la creación en
            # sí, no ese límite de permisos.
            cur.execute(
                "INSERT INTO equipo_accesos (email, password_hash, equipos, vp_de)"
                " VALUES (%s, %s, %s, %s)",
                ("marketing@example.com", generate_password_hash("x"), ["marketing"], ["marketing"]),
            )
        conn.commit()
        conn.close()
        self.client.post(
            "/api/equipo/login", json={"email": "marketing@example.com", "password": "x"}
        )

    def crear_tarea(self, titulo, deadline, estado="pendiente", departamento="marketing"):
        ruta = "/api/marketing" if departamento == "marketing" else f"/api/{departamento}"
        respuesta = self.client.post(
            f"{ruta}/tasks",
            json={
                "titulo": titulo, "instrucciones": "Ver notas.",
                "deadline": deadline, "estado": estado,
            },
        )
        return respuesta.get_json()["task"]

    def test_sin_secreto_rechazado(self):
        respuesta = self.client.post("/api/cron/avisar-deadlines")
        self.assertEqual(respuesta.status_code, 401)

    def test_con_secreto_equivocado_rechazado(self):
        respuesta = self.client.post(
            "/api/cron/avisar-deadlines", headers={"Authorization": "Bearer nopo"}
        )
        self.assertEqual(respuesta.status_code, 401)

    def test_avisa_solo_de_lo_que_vence_manana_y_sigue_abierto(self):
        mañana = (date.today() + timedelta(days=1)).isoformat()
        pasado = (date.today() + timedelta(days=2)).isoformat()

        self.crear_tarea("Diseñar cartel", mañana)
        self.crear_tarea("Ya acabada", mañana, estado="acabado")
        self.crear_tarea("Para pasado mañana", pasado)

        with patch("backend.api.cron.aviso_deadlines_manana") as aviso:
            aviso.return_value = True
            respuesta = self.client.post(
                "/api/cron/avisar-deadlines",
                headers={"Authorization": "Bearer test-cron-secret"},
            )

        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.get_json()["tareas"], 1)
        tareas_avisadas = aviso.call_args[0][0]
        self.assertEqual([t["titulo"] for t in tareas_avisadas], ["Diseñar cartel"])

    def test_purga_auditoria_e_inscripciones_de_hace_mas_de_un_año(self):
        conn = equipo_service._get_connection()
        with conn.cursor() as cur:
            cur.execute("DELETE FROM auditoria")
            cur.execute("UPDATE equipo_accesos SET registro_id = NULL")
            cur.execute("DELETE FROM registrations")
            cur.execute(
                "INSERT INTO auditoria (momento, metodo, ruta, estado)"
                " VALUES (NOW() - INTERVAL '400 days', 'POST', '/api/vieja', 200),"
                "        (NOW() - INTERVAL '10 days', 'POST', '/api/reciente', 200)"
            )
            ids = {}
            for email, dias in (("vieja@upm.es", 400), ("enlazada@upm.es", 400), ("nueva@upm.es", 10)):
                cur.execute(
                    "INSERT INTO registrations (nombre, apellidos, estudios, email,"
                    " privacidad_aceptada, ip_registro, evento, created_at)"
                    " VALUES ('A', 'B', 'C', %s, 'si', '1.1.1.1', 'x', NOW() - make_interval(days => %s))"
                    " RETURNING id",
                    (email, dias),
                )
                ids[email] = cur.fetchone()[0]
            cur.execute(
                "UPDATE equipo_accesos SET registro_id = %s WHERE email = 'marketing@example.com'",
                (ids["enlazada@upm.es"],),
            )
        conn.commit()

        with patch("backend.api.cron.aviso_deadlines_manana", return_value=True):
            respuesta = self.client.post(
                "/api/cron/avisar-deadlines",
                headers={"Authorization": "Bearer test-cron-secret"},
            )

        self.assertEqual(respuesta.get_json()["inscripciones"], 1)
        with conn.cursor() as cur:
            cur.execute("SELECT ruta FROM auditoria WHERE ruta IN ('/api/vieja', '/api/reciente')")
            self.assertEqual([f[0] for f in cur.fetchall()], ["/api/reciente"])
            cur.execute("SELECT email FROM registrations ORDER BY email")
            self.assertEqual([f[0] for f in cur.fetchall()], ["enlazada@upm.es", "nueva@upm.es"])
        conn.close()

    def test_sin_tareas_no_llama_a_slack_con_lista_vacia(self):
        with patch("backend.api.cron.aviso_deadlines_manana") as aviso:
            aviso.return_value = False
            respuesta = self.client.post(
                "/api/cron/avisar-deadlines",
                headers={"Authorization": "Bearer test-cron-secret"},
            )

        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.get_json()["tareas"], 0)
        aviso.assert_called_once_with([])

    def test_un_departamento_que_falla_no_bloquea_a_los_demas(self):
        """Un fallo (p. ej. de base de datos) calculando la salud de un
        departamento no debe impedir que se avise al resto -- ver
        `api_resumen_equipo`."""
        conn = equipo_service._get_connection()
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO equipo_accesos (email, password_hash, equipos)"
                " VALUES (%s, %s, %s)",
                ("eventos@example.com", generate_password_hash("x"), ["eventos"]),
            )
        conn.commit()
        conn.close()

        real_salud_equipo = marketing_service.salud_equipo

        def salud_que_falla_en_eventos(departamento):
            if departamento == "eventos":
                raise RuntimeError("boom")
            return real_salud_equipo(departamento)

        with patch(
            "backend.api.cron.salud_equipo", side_effect=salud_que_falla_en_eventos
        ), patch("backend.api.cron.resumen_salud_equipo", return_value=True):
            respuesta = self.client.post(
                "/api/cron/resumen-equipo",
                headers={"Authorization": "Bearer test-cron-secret"},
            )

        self.assertEqual(respuesta.status_code, 200)
        enviados = respuesta.get_json()["enviados"]
        self.assertIn("marketing", enviados)
        self.assertNotIn("eventos", enviados)


if __name__ == "__main__":
    unittest.main()
