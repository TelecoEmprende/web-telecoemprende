"""Registros del workspace: recursos, presupuesto, anuncios, reuniones, alumni,
decisiones técnicas y servicios (más el estado de la plataforma).

Comparten CRUD (`services/registros.py`), así que lo que se prueba
aquí es lo que las diferencia: el acotado por departamento, lo que es global,
la validación de importes y enlaces y los totales del presupuesto.
"""

import os
import unittest
from unittest import mock

import psycopg2

os.environ["ADMIN_PASSWORD"] = "test-admin"
os.environ["DATABASE_URL"] = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql://telecoemprende:telecoemprende@localhost:5432/telecoemprende_test",
)
os.environ["CRON_SECRET"] = "test-cron-secret"
os.environ["SLACK_SIGNING_SECRET"] = "test-signing-secret"

import app  # noqa: E402
import backend.services.equipo as equipo_service  # noqa: E402
import backend.services.plataforma as plataforma_service  # noqa: E402
import backend.services.registros as registros_service  # noqa: E402
import backend.services.security as security_service  # noqa: E402
from werkzeug.security import generate_password_hash  # noqa: E402


class RegistrosTestCase(unittest.TestCase):
    def setUp(self):
        security_service.request_log.clear()
        equipo_service.init_equipo_db()
        registros_service.init_registros_db()

        conn = registros_service._get_connection()
        with conn.cursor() as cur:
            for tabla in (
                "recursos", "presupuesto_lineas", "anuncios", "reuniones", "alumni",
                "decisiones", "servicios",
            ):
                cur.execute(f"DELETE FROM {tabla}")
            cur.execute("DELETE FROM equipo_accesos")
        conn.commit()
        conn.close()

        app.app.config["TESTING"] = True
        self.client = app.app.test_client()

    def login(self, equipos=("eventos", "ingenieria")):
        conn = equipo_service._get_connection()
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO equipo_accesos (email, password_hash, equipos)"
                " VALUES (%s, %s, %s)",
                ("iker@example.com", generate_password_hash("test-equipo"), list(equipos)),
            )
        conn.commit()
        conn.close()
        respuesta = self.client.post(
            "/api/equipo/login",
            json={"email": "iker@example.com", "password": "test-equipo"},
        )
        self.assertEqual(respuesta.status_code, 200)

    # --- Recursos ---

    def test_crud_de_recursos(self):
        self.login()
        crear = self.client.post(
            "/api/eventos/recursos",
            json={"titulo": "Plano de la feria", "tipo": "documento", "url": "https://x.es/a"},
        )
        self.assertEqual(crear.status_code, 201, crear.get_json())
        fila_id = crear.get_json()["registro"]["id"]

        listado = self.client.get("/api/eventos/recursos").get_json()["recursos"]
        self.assertEqual([r["titulo"] for r in listado], ["Plano de la feria"])

        self.client.put(f"/api/eventos/recursos/{fila_id}", json={"notas": "Pendiente firma"})
        self.assertEqual(
            self.client.get("/api/eventos/recursos").get_json()["recursos"][0]["notas"],
            "Pendiente firma",
        )

        self.assertEqual(
            self.client.delete(f"/api/eventos/recursos/{fila_id}").status_code, 200
        )
        self.assertEqual(self.client.get("/api/eventos/recursos").get_json()["recursos"], [])

    def test_un_recurso_de_eventos_no_se_ve_ni_se_toca_desde_ingenieria(self):
        self.login()
        fila_id = self.client.post(
            "/api/eventos/recursos", json={"titulo": "Plano de la feria"}
        ).get_json()["registro"]["id"]

        self.assertEqual(self.client.get("/api/ingenieria/recursos").get_json()["recursos"], [])
        self.assertEqual(
            self.client.put(
                f"/api/ingenieria/recursos/{fila_id}", json={"titulo": "Secuestrado"}
            ).status_code,
            404,
        )
        self.assertEqual(
            self.client.delete(f"/api/ingenieria/recursos/{fila_id}").status_code, 404
        )

    def test_el_titulo_es_obligatorio_al_crear(self):
        self.login()
        self.assertEqual(
            self.client.post("/api/eventos/recursos", json={"notas": "solo notas"}).status_code,
            400,
        )

    # --- Anuncios: los únicos globales ---

    def test_un_anuncio_se_ve_desde_cualquier_departamento(self):
        self.login()
        self.client.post(
            "/api/eventos/anuncios", json={"titulo": "Reunión general el jueves"}
        )

        desde_ingenieria = self.client.get("/api/ingenieria/anuncios").get_json()["anuncios"]
        self.assertEqual([a["titulo"] for a in desde_ingenieria], ["Reunión general el jueves"])

    def test_los_anuncios_fijados_van_primero(self):
        self.login()
        self.client.post("/api/eventos/anuncios", json={"titulo": "Normal"})
        self.client.post("/api/eventos/anuncios", json={"titulo": "Importante", "fijado": True})

        titulos = [a["titulo"] for a in self.client.get("/api/eventos/anuncios").get_json()["anuncios"]]
        self.assertEqual(titulos[0], "Importante")

    # --- Presupuesto ---

    def test_los_totales_del_presupuesto_salen_exactos(self):
        self.login()
        for tipo, importe, estado in (
            ("ingreso", "500.00", "aprobado"),
            ("gasto", "120.55", "pagado"),
            ("gasto", "80.10", "previsto"),
            ("gasto", "999.00", "cancelado"),
        ):
            self.client.post(
                "/api/eventos/presupuesto",
                json={"concepto": f"{tipo} {importe}", "tipo": tipo,
                      "importe": importe, "estado": estado},
            )

        resumen = self.client.get("/api/eventos/presupuesto/resumen").get_json()["resumen"]
        # Lo cancelado no suma en ningún total.
        self.assertEqual(resumen["ingresos"], "500.00")
        self.assertEqual(resumen["gastos"], "200.65")
        self.assertEqual(resumen["pagado"], "120.55")
        self.assertEqual(resumen["balance"], "299.35")

    def test_un_importe_que_no_es_numero_se_rechaza(self):
        self.login()
        respuesta = self.client.post(
            "/api/eventos/presupuesto", json={"concepto": "Cartelería", "importe": "mucho"}
        )
        self.assertEqual(respuesta.status_code, 400)

    def test_un_importe_negativo_se_rechaza(self):
        self.login()
        respuesta = self.client.post(
            "/api/eventos/presupuesto", json={"concepto": "Cartelería", "importe": "-10"}
        )
        self.assertEqual(respuesta.status_code, 400)

    def test_la_coma_decimal_se_acepta(self):
        self.login()
        self.client.post(
            "/api/eventos/presupuesto", json={"concepto": "Cartelería", "importe": "12,50"}
        )
        lineas = self.client.get("/api/eventos/presupuesto").get_json()["presupuesto"]
        self.assertEqual(lineas[0]["importe"], "12.50")

    # --- Alumni y reuniones ---

    def test_alumni_y_reuniones_viven_en_ingenieria(self):
        self.login()
        self.client.post(
            "/api/ingenieria/alumni",
            json={"nombre": "Marta Ruiz", "promocion": "2019", "empresa": "Telefónica"},
        )
        self.client.post(
            "/api/ingenieria/reuniones",
            json={"titulo": "Kickoff Alumni", "fecha": "2026-10-01",
                  "asistentes": ["iker@example.com"]},
        )

        alumni = self.client.get("/api/ingenieria/alumni").get_json()["alumni"]
        self.assertEqual(alumni[0]["empresa"], "Telefónica")
        self.assertEqual(alumni[0]["estado"], "pendiente")

        reuniones = self.client.get("/api/ingenieria/reuniones").get_json()["reuniones"]
        self.assertEqual(reuniones[0]["asistentes"], ["iker@example.com"])

    def test_un_estado_de_alumni_inventado_se_rechaza(self):
        self.login()
        respuesta = self.client.post(
            "/api/ingenieria/alumni", json={"nombre": "Marta", "estado": "no-existe"}
        )
        self.assertEqual(respuesta.status_code, 400)

    # --- Enlaces: solo http(s) ---

    def test_un_enlace_que_no_es_http_se_rechaza_en_todos_los_campos_url(self):
        self.login()
        for ruta, base, clave in (
            ("recursos", {"titulo": "X"}, "url"),
            ("alumni", {"nombre": "X"}, "linkedin"),
            ("servicios", {"nombre": "X"}, "url"),
        ):
            for malo in ("javascript:alert(1)", "data:text/html,<b>x</b>", "github.com/x"):
                respuesta = self.client.post(
                    f"/api/ingenieria/{ruta}", json={**base, clave: malo}
                )
                self.assertEqual(respuesta.status_code, 400, (ruta, malo))
            bueno = self.client.post(
                f"/api/ingenieria/{ruta}", json={**base, clave: "https://github.com/x"}
            )
            self.assertEqual(bueno.status_code, 201, (ruta, bueno.get_json()))

    # --- Ingeniería: decisiones técnicas y servicios ---

    def test_decisiones_y_servicios_viven_en_ingenieria(self):
        self.login()
        self.client.post(
            "/api/ingenieria/decisiones",
            json={"titulo": "Postgres en Supabase", "estado": "aceptada",
                  "fecha": "2026-09-01", "contexto": "Hacía falta una BD.",
                  "decision": "Supabase por el plan gratuito."},
        )
        self.client.post(
            "/api/ingenieria/servicios",
            json={"nombre": "Vercel", "tipo": "alojamiento", "estado": "activo",
                  "url": "https://vercel.com", "renovacion": "2027-01-15",
                  "responsables": ["iker@example.com"]},
        )

        decisiones = self.client.get("/api/ingenieria/decisiones").get_json()["decisiones"]
        self.assertEqual(decisiones[0]["estado"], "aceptada")
        self.assertEqual(decisiones[0]["fecha"], "2026-09-01")

        servicios = self.client.get("/api/ingenieria/servicios").get_json()["servicios"]
        self.assertEqual(servicios[0]["responsables"], ["iker@example.com"])
        self.assertEqual(servicios[0]["renovacion"], "2027-01-15")

    def test_defaults_de_decisiones_y_servicios(self):
        self.login()
        self.client.post("/api/ingenieria/decisiones", json={"titulo": "Usar Tailwind"})
        self.client.post("/api/ingenieria/servicios", json={"nombre": "GoDaddy"})
        self.assertEqual(
            self.client.get("/api/ingenieria/decisiones").get_json()["decisiones"][0]["estado"],
            "propuesta",
        )
        servicio = self.client.get("/api/ingenieria/servicios").get_json()["servicios"][0]
        self.assertEqual((servicio["estado"], servicio["tipo"]), ("activo", "otro"))

    def test_estados_inventados_de_decisiones_y_servicios_se_rechazan(self):
        self.login()
        self.assertEqual(
            self.client.post(
                "/api/ingenieria/decisiones", json={"titulo": "X", "estado": "quizá"}
            ).status_code,
            400,
        )
        self.assertEqual(
            self.client.post(
                "/api/ingenieria/servicios", json={"nombre": "X", "tipo": "nube-magica"}
            ).status_code,
            400,
        )

    def test_una_decision_de_ingenieria_no_se_ve_desde_eventos(self):
        self.login()
        fila_id = self.client.post(
            "/api/ingenieria/decisiones", json={"titulo": "Usar Tailwind"}
        ).get_json()["registro"]["id"]

        self.assertEqual(self.client.get("/api/eventos/decisiones").get_json()["decisiones"], [])
        self.assertEqual(
            self.client.delete(f"/api/eventos/decisiones/{fila_id}").status_code, 404
        )

    # --- Plataforma ---

    def test_plataforma_enseña_el_estado_sin_filtrar_ningun_valor(self):
        self.login()
        secreto = "re_SECRETO-que-no-debe-salir"
        with mock.patch.object(plataforma_service, "RESEND_API_KEY", secreto), \
                mock.patch.object(plataforma_service, "SLACK_WEBHOOK_URL", ""), \
                mock.patch.dict(os.environ, {"VERCEL_GIT_COMMIT_SHA": "24c1de7abcdef0123"}):
            respuesta = self.client.get("/api/ingenieria/plataforma")

        self.assertEqual(respuesta.status_code, 200, respuesta.get_json())
        datos = respuesta.get_json()
        self.assertTrue(datos["base_de_datos"]["ok"])
        self.assertEqual(datos["commit"], "24c1de7")
        por_nombre = {i["nombre"]: i["configurada"] for i in datos["integraciones"]}
        self.assertTrue(por_nombre["Correo (Resend)"])
        self.assertFalse(por_nombre["Avisos de Slack"])
        # Un sí o un no: el valor de la clave no viaja nunca.
        self.assertNotIn(secreto, respuesta.get_data(as_text=True))

    def test_plataforma_es_solo_de_ingenieria(self):
        self.login(equipos=("eventos",))
        # Su propio departamento: la ruta existe pero no es suya.
        self.assertEqual(self.client.get("/api/eventos/plataforma").status_code, 404)
        # El de Ingeniería: ni se entra.
        self.assertEqual(self.client.get("/api/ingenieria/plataforma").status_code, 401)

    def test_plataforma_sin_sesion_no_se_entra(self):
        self.assertEqual(self.client.get("/api/ingenieria/plataforma").status_code, 401)

    def test_con_la_base_de_datos_caida_lo_dice_en_vez_de_reventar(self):
        with mock.patch.object(
            plataforma_service.psycopg2, "connect", side_effect=psycopg2.OperationalError
        ):
            self.assertEqual(
                plataforma_service.estado_plataforma()["base_de_datos"],
                {"ok": False, "ms": None},
            )

    # --- Autorización ---

    def test_sin_pertenecer_al_departamento_no_se_entra(self):
        self.login(equipos=("eventos",))
        self.assertEqual(self.client.get("/api/ingenieria/alumni").status_code, 401)
        self.assertEqual(self.client.get("/api/eventos/recursos").status_code, 200)

    def test_sin_sesion_no_se_entra(self):
        self.assertEqual(self.client.get("/api/eventos/recursos").status_code, 401)
        self.assertEqual(self.client.get("/api/eventos/anuncios").status_code, 401)


if __name__ == "__main__":
    unittest.main()
