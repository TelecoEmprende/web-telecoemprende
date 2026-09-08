"""Aviso diario de deadlines de mañana, disparado por Vercel Cron.

Sin sesión de por medio: la autorización va en el header Authorization, no
en una cookie de /equipo (ver backend/api/cron.py).
"""

import os
import unittest
from datetime import date, timedelta
from unittest.mock import patch

os.environ["ADMIN_PASSWORD"] = "test-admin"
os.environ["DATABASE_URL"] = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql://telecoemprende:telecoemprende@localhost:5432/telecoemprende_test",
)
os.environ["CRON_SECRET"] = "test-cron-secret"

import app  # noqa: E402
import backend.services.equipo as equipo_service  # noqa: E402
import backend.services.marketing as marketing_service  # noqa: E402
from werkzeug.security import generate_password_hash  # noqa: E402


class CronTests(unittest.TestCase):
    def setUp(self):
        equipo_service.init_equipo_db()
        marketing_service.init_marketing_db()

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
            cur.execute(
                "INSERT INTO equipo_accesos (email, password_hash, equipos)"
                " VALUES (%s, %s, %s)",
                ("marketing@example.com", generate_password_hash("x"), ["marketing"]),
            )
        conn.commit()
        conn.close()
        self.client.post(
            "/api/equipo/login", json={"email": "marketing@example.com", "password": "x"}
        )

    def crear_tarea(self, titulo, deadline, estado="pendiente", departamento="marketing"):
        ruta = "/api/marketing" if departamento == "marketing" else f"/api/{departamento}"
        respuesta = self.client.post(
            f"{ruta}/tasks", json={"titulo": titulo, "deadline": deadline, "estado": estado}
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


if __name__ == "__main__":
    unittest.main()
