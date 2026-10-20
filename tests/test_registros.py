"""Registros del workspace: presupuesto, reuniones y servicios (más el estado de la plataforma).

Comparten CRUD (`services/registros.py`), así que lo que se prueba
aquí es lo que las diferencia: el acotado por departamento, lo que es global,
la validación de importes y enlaces y los totales del presupuesto.
"""

import os
import unittest
from unittest import mock

import psycopg2

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
from backend.services.db import migrar  # noqa: E402


class RegistrosTestCase(unittest.TestCase):
    def setUp(self):
        security_service.request_log.clear()
        migrar()

        conn = registros_service._get_connection()
        with conn.cursor() as cur:
            for tabla in ("budget_lines", "meetings", "services"):
                cur.execute(f"DELETE FROM {tabla}")
            cur.execute("DELETE FROM members")
        conn.commit()
        conn.close()

        app.app.config["TESTING"] = True
        self.client = app.app.test_client()

    def login(self, equipos=("eventos", "ingenieria"), cargo="boardmember", email="iker@example.com"):
        conn = equipo_service._get_connection()
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO members (email, password_hash, preferred_departments, role)"
                " VALUES (%s, %s, %s, %s)",
                (
                    email,
                    generate_password_hash("test-equipo"),
                    list(equipos),
                    cargo,
                ),
            )
        conn.commit()
        conn.close()
        respuesta = self.client.post(
            "/api/equipo/login",
            json={"email": email, "password": "test-equipo"},
        )
        self.assertEqual(respuesta.status_code, 200)

    # --- CRUD y aislamiento (sobre reuniones) ---

    def test_crud_de_reuniones(self):
        self.login()
        crear = self.client.post(
            "/api/eventos/reuniones",
            json={"titulo": "Plano de la feria", "fecha": "2026-10-01"},
        )
        self.assertEqual(crear.status_code, 201, crear.get_json())
        fila_id = crear.get_json()["registro"]["id"]

        listado = self.client.get("/api/eventos/reuniones").get_json()["reuniones"]
        self.assertEqual([r["titulo"] for r in listado], ["Plano de la feria"])

        acta = [{"type": "paragraph", "content": [{"type": "text", "text": "Pendiente firma"}]}]
        guardar = self.client.put(f"/api/eventos/reuniones/{fila_id}", json={"contenido": acta})
        self.assertEqual(guardar.status_code, 200, guardar.get_json())
        self.assertEqual(
            self.client.get("/api/eventos/reuniones").get_json()["reuniones"][0]["contenido"], acta
        )

        self.assertEqual(
            self.client.delete(f"/api/eventos/reuniones/{fila_id}").status_code, 200
        )
        self.assertEqual(self.client.get("/api/eventos/reuniones").get_json()["reuniones"], [])

    def test_el_acta_rechaza_enlaces_peligrosos(self):
        self.login()
        fila_id = self.client.post(
            "/api/eventos/reuniones", json={"titulo": "Plano de la feria"}
        ).get_json()["registro"]["id"]
        mala = [{"type": "paragraph", "content": [
            {"type": "link", "href": "javascript:alert(1)", "content": [{"type": "text", "text": "x"}]}
        ]}]
        respuesta = self.client.put(f"/api/eventos/reuniones/{fila_id}", json={"contenido": mala})
        self.assertEqual(respuesta.status_code, 400)

    def test_una_reunion_de_todo_el_club_se_ve_desde_cualquier_departamento(self):
        self.login()
        self.client.post(
            "/api/eventos/reuniones", json={"titulo": "Reunión semanal", "club": True}
        )
        for depto in ("eventos", "marketing", "ingenieria"):
            titulos = [r["titulo"] for r in self.client.get(f"/api/{depto}/reuniones").get_json()["reuniones"]]
            self.assertEqual(titulos, ["Reunión semanal"], depto)

    def test_una_reunion_de_eventos_no_se_ve_ni_se_toca_desde_ingenieria(self):
        self.login()
        fila_id = self.client.post(
            "/api/eventos/reuniones", json={"titulo": "Plano de la feria"}
        ).get_json()["registro"]["id"]

        self.assertEqual(self.client.get("/api/ingenieria/reuniones").get_json()["reuniones"], [])
        self.assertEqual(
            self.client.put(
                f"/api/ingenieria/reuniones/{fila_id}", json={"titulo": "Secuestrado"}
            ).status_code,
            404,
        )
        self.assertEqual(
            self.client.delete(f"/api/ingenieria/reuniones/{fila_id}").status_code, 404
        )

    def test_varios_departamentos_en_una_peticion(self):
        self.login()
        self.client.post("/api/eventos/reuniones", json={"titulo": "De eventos"})
        self.client.post("/api/ingenieria/reuniones", json={"titulo": "De ingeniería"})
        self.client.post("/api/eventos/reuniones", json={"titulo": "Semanal", "club": True})
        self.client.post("/api/marketing/reuniones", json={"titulo": "De marketing"})

        filas = self.client.get("/api/eventos/reuniones?deptos=eventos,ingenieria").get_json()["reuniones"]
        self.assertEqual(sorted(r["titulo"] for r in filas), ["De eventos", "De ingeniería", "Semanal"])
        self.assertEqual(self.client.get("/api/eventos/reuniones?deptos=nada").status_code, 400)

    # --- Reuniones de directiva ---

    def _de_directiva(self, **extra):
        self.login()  # boardmember
        respuesta = self.client.post(
            "/api/eventos/reuniones",
            json={"titulo": "Junta", "fecha": "2026-10-20", "directiva": True, **extra},
        )
        self.assertEqual(respuesta.status_code, 201, respuesta.get_json())
        return respuesta.get_json()["registro"]

    def _entrar_sin_cargo(self):
        self.client.post("/api/equipo/logout")
        self.login(cargo="", email="ana@example.com")

    def test_una_de_directiva_por_defecto_solo_la_ve_la_directiva(self):
        fila = self._de_directiva()
        self.assertEqual((fila["departamento"], fila["solo_directiva"]), ("directiva", True))
        for depto in ("eventos", "marketing", "ingenieria"):
            titulos = [r["titulo"] for r in self.client.get(f"/api/{depto}/reuniones").get_json()["reuniones"]]
            self.assertEqual(titulos, ["Junta"], depto)

        self._entrar_sin_cargo()
        self.assertEqual(self.client.get("/api/eventos/reuniones").get_json()["reuniones"], [])
        calendario = self.client.get("/api/equipo/calendario-equipo?desde=2026-10-01&hasta=2026-10-31")
        self.assertNotIn("Junta", [i["titulo"] for i in calendario.get_json()["items"]])
        historial = self.client.get("/api/equipo/historial").get_json()["eventos"]
        self.assertNotIn("Junta", [e["titulo"] for e in historial])
        self.assertEqual(self.client.put(f"/api/eventos/reuniones/{fila['id']}", json={"titulo": "X"}).status_code, 404)
        self.assertEqual(self.client.delete(f"/api/eventos/reuniones/{fila['id']}").status_code, 404)

    def test_la_directiva_elige_que_la_vea_todo_el_club_pero_solo_ella_la_toca(self):
        fila = self._de_directiva(solo_directiva=False)

        self._entrar_sin_cargo()
        self.assertEqual([r["titulo"] for r in self.client.get("/api/marketing/reuniones").get_json()["reuniones"]], ["Junta"])
        self.assertEqual(self.client.put(f"/api/eventos/reuniones/{fila['id']}", json={"titulo": "X"}).status_code, 404)

    def test_sin_cargo_no_se_convoca_una_de_directiva(self):
        self.login(cargo="")
        respuesta = self.client.post("/api/eventos/reuniones", json={"titulo": "Junta", "directiva": True})
        self.assertEqual(respuesta.status_code, 403)

    def test_una_borrada_de_directiva_no_sale_en_la_papelera_de_los_demas(self):
        fila = self._de_directiva()
        self.client.delete(f"/api/eventos/reuniones/{fila['id']}")
        self.assertEqual([e["titulo"] for e in self.client.get("/api/equipo/papelera").get_json()["elementos"]], ["Junta"])

        self._entrar_sin_cargo()
        self.assertEqual(self.client.get("/api/equipo/papelera").get_json()["elementos"], [])
        self.assertEqual(self.client.post(f"/api/equipo/papelera/reunion/{fila['id']}/restaurar").status_code, 404)

    def test_solo_las_de_directiva_pueden_ser_solo_de_la_directiva(self):
        self.login()
        fila_id = self.client.post("/api/eventos/reuniones", json={"titulo": "Semanal"}).get_json()["registro"]["id"]
        respuesta = self.client.put(f"/api/eventos/reuniones/{fila_id}", json={"solo_directiva": True})
        self.assertEqual(respuesta.status_code, 400)

    def test_cambiar_de_quien_es_una_reunion_ya_creada(self):
        self.login()
        fila_id = self.client.post(
            "/api/eventos/reuniones", json={"titulo": "Reunión directiva", "club": True}
        ).get_json()["registro"]["id"]

        # De todo el club a la directiva: ya no la ve quien no es de la directiva.
        self.assertEqual(
            self.client.put(
                f"/api/eventos/reuniones/{fila_id}", json={"departamento": "directiva", "solo_directiva": True}
            ).status_code,
            200,
        )
        fila = self.client.get("/api/eventos/reuniones").get_json()["reuniones"][0]
        self.assertEqual((fila["departamento"], fila["solo_directiva"]), ("directiva", True))

        # Y de vuelta a un departamento: «solo la directiva» se quita sola.
        self.assertEqual(
            self.client.put(f"/api/eventos/reuniones/{fila_id}", json={"departamento": "marketing"}).status_code,
            200,
        )
        fila = self.client.get("/api/marketing/reuniones").get_json()["reuniones"][0]
        self.assertEqual((fila["departamento"], fila["solo_directiva"]), ("marketing", False))
        self.assertEqual(
            self.client.put(f"/api/marketing/reuniones/{fila_id}", json={"departamento": "nada"}).status_code,
            400,
        )

    def test_sin_cargo_no_se_pasa_una_reunion_a_la_directiva(self):
        self.login(cargo="")
        fila_id = self.client.post(
            "/api/eventos/reuniones", json={"titulo": "Semanal", "club": True}
        ).get_json()["registro"]["id"]
        respuesta = self.client.put(f"/api/eventos/reuniones/{fila_id}", json={"departamento": "directiva"})
        self.assertEqual(respuesta.status_code, 403)
        # A un departamento sí: cualquiera edita todo.
        self.assertEqual(
            self.client.put(f"/api/eventos/reuniones/{fila_id}", json={"departamento": "eventos"}).status_code,
            200,
        )

    def test_el_titulo_es_obligatorio_al_crear(self):
        self.login()
        self.assertEqual(
            self.client.post("/api/eventos/reuniones", json={"acta": "solo acta"}).status_code,
            400,
        )

    # --- Presupuesto ---

    def test_presupuesto_exige_cargo_vp_o_admin(self):
        self.login(cargo="")
        self.assertEqual(self.client.get("/api/eventos/presupuesto").status_code, 403)
        self.assertEqual(self.client.get("/api/eventos/presupuesto/resumen").status_code, 403)

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

    # --- Reuniones ---

    def test_reuniones_guardan_asistentes(self):
        self.login()
        self.client.post(
            "/api/ingenieria/reuniones",
            json={"titulo": "Kickoff", "fecha": "2026-10-01",
                  "asistentes": ["iker@example.com"]},
        )
        reuniones = self.client.get("/api/ingenieria/reuniones").get_json()["reuniones"]
        self.assertEqual(reuniones[0]["asistentes"], ["iker@example.com"])

    # --- Enlaces: solo http(s) ---

    def test_un_enlace_que_no_es_http_se_rechaza_en_todos_los_campos_url(self):
        self.login()
        for ruta, base, clave in (
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

    # --- Ingeniería: servicios ---

    def test_servicios_viven_en_ingenieria(self):
        self.login()
        self.client.post(
            "/api/ingenieria/servicios",
            json={"nombre": "Vercel", "tipo": "alojamiento", "estado": "activo",
                  "url": "https://vercel.com", "renovacion": "2027-01-15",
                  "responsables": ["iker@example.com"]},
        )
        servicios = self.client.get("/api/ingenieria/servicios").get_json()["servicios"]
        self.assertEqual(servicios[0]["responsables"], ["iker@example.com"])
        self.assertEqual(servicios[0]["renovacion"], "2027-01-15")

    def test_defaults_de_servicios(self):
        self.login()
        self.client.post("/api/ingenieria/servicios", json={"nombre": "GoDaddy"})
        servicio = self.client.get("/api/ingenieria/servicios").get_json()["servicios"][0]
        self.assertEqual((servicio["estado"], servicio["tipo"]), ("activo", "otro"))

    def test_un_tipo_de_servicio_inventado_se_rechaza(self):
        self.login()
        self.assertEqual(
            self.client.post(
                "/api/ingenieria/servicios", json={"nombre": "X", "tipo": "nube-magica"}
            ).status_code,
            400,
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
        # La de Ingeniería la ve todo el club: todos somos de los tres departamentos.
        self.assertEqual(self.client.get("/api/ingenieria/plataforma").status_code, 200)

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

    def test_todos_entran_en_los_tres_departamentos(self):
        self.login(equipos=("eventos",))
        self.assertEqual(self.client.get("/api/ingenieria/reuniones").status_code, 200)
        self.assertEqual(self.client.get("/api/eventos/reuniones").status_code, 200)

    def test_sin_sesion_no_se_entra(self):
        self.assertEqual(self.client.get("/api/eventos/reuniones").status_code, 401)
        self.assertEqual(self.client.get("/api/eventos/presupuesto").status_code, 401)


    # --- Accesos del club (Herramientas) ---

    def test_accesos_solo_los_servicios_marcados_para_el_club(self):
        self.login(equipos=("ingenieria",))
        for nombre, url, visible in (
            ("WhatsApp del club", "https://chat.whatsapp.com/abc", True),
            ("Supabase", "https://supabase.com/dashboard", False),
            ("Sin enlace", "", True),
        ):
            r = self.client.post(
                "/api/ingenieria/servicios",
                json={"nombre": nombre, "tipo": "mensajeria", "url": url, "visible_club": visible},
            )
            self.assertEqual(r.status_code, 201, r.get_json())

        self.client.post("/api/equipo/logout")
        conn = equipo_service._get_connection()
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO members (email, password_hash, preferred_departments) VALUES (%s, %s, %s)",
                ("mkt@example.com", generate_password_hash("pw"), ["marketing"]),
            )
        conn.commit()
        conn.close()
        self.client.post("/api/equipo/login", json={"email": "mkt@example.com", "password": "pw"})

        respuesta = self.client.get("/api/equipo/accesos").get_json()
        self.assertEqual([a["nombre"] for a in respuesta["accesos"]], ["WhatsApp del club"])
        self.assertTrue(respuesta["luma"].startswith("https://"))


if __name__ == "__main__":
    unittest.main()
