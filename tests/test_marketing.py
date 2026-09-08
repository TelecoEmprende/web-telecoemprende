import os
import unittest

os.environ["ADMIN_PASSWORD"] = "test-admin"
os.environ["DATABASE_URL"] = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql://telecoemprende:telecoemprende@localhost:5432/telecoemprende_test",
)
os.environ["CRON_SECRET"] = "test-cron-secret"

import app  # noqa: E402
import backend.services.equipo as equipo_service  # noqa: E402
import backend.services.marketing as marketing_service  # noqa: E402
import backend.services.registros as registros_service  # noqa: E402
import backend.services.security as security_service  # noqa: E402
import backend.services.slack as marketing_api_slack  # noqa: E402
import urllib.error  # noqa: E402
from werkzeug.security import generate_password_hash  # noqa: E402


class MarketingTestCase(unittest.TestCase):
    def setUp(self):
        security_service.request_log.clear()
        equipo_service.init_equipo_db()
        marketing_service.init_marketing_db()
        registros_service.init_registros_db()

        conn = marketing_service._get_connection()
        with conn.cursor() as cur:
            # Las tres en una sentencia: campaigns arrastra el resto por cascada,
            # pero ser explícito deja el estado claro si alguien mira la tabla.
            cur.execute("DELETE FROM tasks")
            cur.execute("DELETE FROM contents")
            cur.execute("DELETE FROM campaigns")
            cur.execute("DELETE FROM equipo_accesos")
            # El calendario ahora también lee reuniones (services/registros.py);
            # sin limpiarlas aquí, una reunión creada en un test se cuela en el
            # rango de fechas amplio que usan otros.
            cur.execute("DELETE FROM reuniones")
        conn.commit()
        conn.close()

        app.app.config["TESTING"] = True
        self.client = app.app.test_client()

    def seed_acceso(self, email="marketing@example.com", password="test-equipo",
                    equipos=None):
        conn = equipo_service._get_connection()
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO equipo_accesos (email, password_hash, equipos)"
                " VALUES (%s, %s, %s)",
                (email, generate_password_hash(password), equipos or ["marketing"]),
            )
        conn.commit()
        conn.close()

    def login(self, email="marketing@example.com", password="test-equipo",
              equipos=None):
        self.seed_acceso(email, password, equipos)
        respuesta = self.client.post(
            "/api/equipo/login", json={"email": email, "password": password}
        )
        self.assertEqual(respuesta.status_code, 200)

    def crear_campaign(self, nombre="Cómo empezar a invertir", **extra):
        respuesta = self.client.post(
            "/api/marketing/campaigns", json={"nombre": nombre, **extra}
        )
        self.assertEqual(respuesta.status_code, 201, respuesta.get_json())
        return respuesta.get_json()["campaign"]

    def crear_content(self, campaign_id, titulo="Reel: cómo empezar a invertir", **extra):
        respuesta = self.client.post(
            f"/api/marketing/campaigns/{campaign_id}/contents",
            json={"titulo": titulo, **extra},
        )
        self.assertEqual(respuesta.status_code, 201, respuesta.get_json())
        return respuesta.get_json()["content"]


# --------------------------------------------------------------------------
# Autorización: lo más crítico. Los permisos viven en backend, no en el front.
# --------------------------------------------------------------------------

class AutorizacionTests(MarketingTestCase):
    RUTAS = (
        ("GET", "/api/marketing/campaigns"),
        ("POST", "/api/marketing/campaigns"),
        ("GET", "/api/marketing/campaigns/1"),
        ("PUT", "/api/marketing/campaigns/1"),
        ("DELETE", "/api/marketing/campaigns/1"),
        ("POST", "/api/marketing/campaigns/1/contents"),
        ("GET", "/api/marketing/contents/1"),
        ("PUT", "/api/marketing/contents/1"),
        ("DELETE", "/api/marketing/contents/1"),
        ("GET", "/api/marketing/tasks"),
        ("POST", "/api/marketing/tasks"),
        ("GET", "/api/marketing/tasks/1"),
        ("PUT", "/api/marketing/tasks/1"),
        ("DELETE", "/api/marketing/tasks/1"),
        ("GET", "/api/marketing/calendario"),
        ("GET", "/api/marketing/miembros"),
    )

    def test_todas_las_rutas_rechazan_sin_sesion(self):
        for metodo, ruta in self.RUTAS:
            with self.subTest(ruta=f"{metodo} {ruta}"):
                respuesta = self.client.open(ruta, method=metodo, json={})
                self.assertEqual(respuesta.status_code, 401)

    def test_miembro_de_otro_equipo_no_entra(self):
        self.login(email="eventos@example.com", equipos=["eventos"])

        for metodo, ruta in self.RUTAS:
            with self.subTest(ruta=f"{metodo} {ruta}"):
                respuesta = self.client.open(ruta, method=metodo, json={})
                self.assertEqual(respuesta.status_code, 401)

    def test_miembro_de_marketing_entra(self):
        self.login()

        respuesta = self.client.get("/api/marketing/campaigns")
        self.assertEqual(respuesta.status_code, 200)

    def test_ingenieria_entra_como_admin(self):
        # login_equipo da admin_auth al equipo de ingeniería; el decorador lo
        # acepta como superusuario aunque no esté en el equipo de marketing.
        self.login(email="dev@example.com", equipos=["ingenieria"])

        respuesta = self.client.get("/api/marketing/campaigns")
        self.assertEqual(respuesta.status_code, 200)

    def test_logout_corta_el_acceso(self):
        self.login()
        self.client.post("/api/equipo/logout")

        respuesta = self.client.get("/api/marketing/campaigns")
        self.assertEqual(respuesta.status_code, 401)


# --------------------------------------------------------------------------
# Campaign -> Content -> Task
# --------------------------------------------------------------------------

class CampaignTests(MarketingTestCase):
    def setUp(self):
        super().setUp()
        self.login()

    def test_crear_y_listar(self):
        self.crear_campaign(objetivo="Captar estudiantes", fecha="2026-10-01")

        respuesta = self.client.get("/api/marketing/campaigns")
        campaigns = respuesta.get_json()["campaigns"]
        self.assertEqual(len(campaigns), 1)
        self.assertEqual(campaigns[0]["nombre"], "Cómo empezar a invertir")
        self.assertEqual(campaigns[0]["objetivo"], "Captar estudiantes")
        self.assertEqual(campaigns[0]["fecha"], "2026-10-01")
        self.assertEqual(campaigns[0]["total_contents"], 0)

    def test_nombre_obligatorio(self):
        respuesta = self.client.post("/api/marketing/campaigns", json={"nombre": "  "})
        self.assertEqual(respuesta.status_code, 400)

    def test_fecha_mal_formada_rechazada(self):
        respuesta = self.client.post(
            "/api/marketing/campaigns", json={"nombre": "X", "fecha": "01/10/2026"}
        )
        self.assertEqual(respuesta.status_code, 400)

    def test_creador_queda_registrado(self):
        campaign = self.crear_campaign()
        self.assertEqual(campaign["creado_por"], "marketing@example.com")

    def test_detalle_anida_contents_y_tasks(self):
        campaign = self.crear_campaign()
        content = self.crear_content(campaign["id"])
        self.client.post(
            "/api/marketing/tasks",
            json={"titulo": "Escribir guion", "content_id": content["id"]},
        )

        detalle = self.client.get(f"/api/marketing/campaigns/{campaign['id']}").get_json()
        self.assertEqual(len(detalle["campaign"]["contents"]), 1)
        self.assertEqual(len(detalle["campaign"]["contents"][0]["tasks"]), 1)
        self.assertEqual(
            detalle["campaign"]["contents"][0]["tasks"][0]["titulo"], "Escribir guion"
        )

    def test_actualizar(self):
        campaign = self.crear_campaign()

        respuesta = self.client.put(
            f"/api/marketing/campaigns/{campaign['id']}", json={"nombre": "Otro nombre"}
        )
        self.assertEqual(respuesta.status_code, 200)

        detalle = self.client.get(f"/api/marketing/campaigns/{campaign['id']}").get_json()
        self.assertEqual(detalle["campaign"]["nombre"], "Otro nombre")

    def test_eliminar_arrastra_contents_y_tasks(self):
        campaign = self.crear_campaign()
        content = self.crear_content(campaign["id"])
        self.client.post(
            "/api/marketing/tasks",
            json={"titulo": "Grabar", "content_id": content["id"]},
        )

        respuesta = self.client.delete(f"/api/marketing/campaigns/{campaign['id']}")
        self.assertEqual(respuesta.status_code, 200)

        self.assertEqual(
            self.client.get(f"/api/marketing/contents/{content['id']}").status_code, 404
        )
        self.assertEqual(self.client.get("/api/marketing/tasks").get_json()["tasks"], [])

    def test_campaign_inexistente_da_404(self):
        self.assertEqual(
            self.client.get("/api/marketing/campaigns/9999").status_code, 404
        )

    def test_duplicar_copia_contents_y_tasks_en_blanco(self):
        campaign = self.crear_campaign(
            nombre="Reunión semanal", objetivo="Poner al día al equipo", fecha="2026-10-01",
        )
        content = self.crear_content(
            campaign["id"], titulo="Post de la reunión", fecha_publicacion="2026-10-02",
            estado="publicado", script="Guion original",
        )
        self.client.post(
            "/api/marketing/tasks",
            json={
                "titulo": "Escribir guion", "content_id": content["id"], "estado": "acabado",
                "deadline": "2026-10-01",
                "checklist": [{"texto": "Revisar ortografía", "hecho": True}],
            },
        )
        self.client.post(
            "/api/marketing/tasks",
            json={"titulo": "Reservar sala", "campaign_id": campaign["id"], "estado": "acabado"},
        )

        respuesta = self.client.post(f"/api/marketing/campaigns/{campaign['id']}/duplicar")
        self.assertEqual(respuesta.status_code, 201, respuesta.get_json())
        copia = respuesta.get_json()["campaign"]

        self.assertEqual(copia["nombre"], "Reunión semanal (copia)")
        self.assertEqual(copia["objetivo"], "Poner al día al equipo")
        self.assertIsNone(copia["fecha"])
        self.assertNotEqual(copia["id"], campaign["id"])

        self.assertEqual(len(copia["contents"]), 1)
        content_copia = copia["contents"][0]
        self.assertEqual(content_copia["titulo"], "Post de la reunión")
        self.assertEqual(content_copia["script"], "Guion original")
        self.assertEqual(content_copia["estado"], "idea")
        self.assertIsNone(content_copia["fecha_publicacion"])

        self.assertEqual(len(content_copia["tasks"]), 1)
        tarea_copia = content_copia["tasks"][0]
        self.assertEqual(tarea_copia["titulo"], "Escribir guion")
        self.assertEqual(tarea_copia["estado"], "pendiente")
        self.assertIsNone(tarea_copia["deadline"])
        self.assertEqual(tarea_copia["checklist"], [{"texto": "Revisar ortografía", "hecho": False}])

        self.assertEqual(len(copia["tasks_sueltas"]), 1)
        self.assertEqual(copia["tasks_sueltas"][0]["titulo"], "Reservar sala")
        self.assertEqual(copia["tasks_sueltas"][0]["estado"], "pendiente")

        # La original no se toca.
        original = self.client.get(f"/api/marketing/campaigns/{campaign['id']}").get_json()
        self.assertEqual(original["campaign"]["nombre"], "Reunión semanal")
        self.assertEqual(original["campaign"]["contents"][0]["estado"], "publicado")

    def test_duplicar_campaign_inexistente_da_404(self):
        self.assertEqual(
            self.client.post("/api/marketing/campaigns/9999/duplicar").status_code, 404
        )


class ContentTests(MarketingTestCase):
    def setUp(self):
        super().setUp()
        self.login()
        self.campaign = self.crear_campaign()

    def test_crear_con_todos_los_campos(self):
        content = self.crear_content(
            self.campaign["id"],
            tipo="reel",
            plataforma="instagram",
            fecha_publicacion="2026-10-05",
            script="Hola, hoy te cuento...",
            copy_texto="Invertir no es para ricos.",
            cta="Apúntate en el link",
            hashtags="#inversion #upm",
            idea_visual="Plano cenital de una hucha",
            responsables=["abril@example.com", "hugo@example.com"],
            enlaces=["https://drive.google.com/file/abc"],
        )

        self.assertEqual(content["tipo"], "reel")
        self.assertEqual(content["estado"], "idea")
        self.assertEqual(len(content["responsables"]), 2)
        self.assertEqual(content["enlaces"], ["https://drive.google.com/file/abc"])

    def test_estado_invalido_rechazado(self):
        respuesta = self.client.post(
            f"/api/marketing/campaigns/{self.campaign['id']}/contents",
            json={"titulo": "X", "estado": "inventado"},
        )
        self.assertEqual(respuesta.status_code, 400)

    def test_recorre_su_workflow(self):
        content = self.crear_content(self.campaign["id"])

        for estado in ("en_diseno", "en_revision", "programado", "publicado"):
            respuesta = self.client.put(
                f"/api/marketing/contents/{content['id']}", json={"estado": estado}
            )
            self.assertEqual(respuesta.status_code, 200)

        detalle = self.client.get(f"/api/marketing/contents/{content['id']}").get_json()
        self.assertEqual(detalle["content"]["estado"], "publicado")

    def test_publicar_cierra_sus_tareas_pendientes(self):
        content = self.crear_content(self.campaign["id"])
        pendiente = self.client.post(
            "/api/marketing/tasks",
            json={"titulo": "Grabar", "content_id": content["id"]},
        ).get_json()["task"]
        ya_acabada = self.client.post(
            "/api/marketing/tasks",
            json={"titulo": "Guion", "content_id": content["id"], "estado": "acabado"},
        ).get_json()["task"]

        respuesta = self.client.put(
            f"/api/marketing/contents/{content['id']}", json={"estado": "publicado"}
        )
        self.assertEqual(respuesta.status_code, 200)

        tareas = {t["id"]: t for t in self.client.get("/api/marketing/tasks").get_json()["tasks"]}
        self.assertEqual(tareas[pendiente["id"]]["estado"], "acabado")
        # No pisa el updated_at de una que ya estaba acabada de antes.
        self.assertEqual(tareas[ya_acabada["id"]]["estado"], "acabado")

    def test_cambiar_a_otro_estado_no_toca_las_tareas(self):
        content = self.crear_content(self.campaign["id"])
        tarea = self.client.post(
            "/api/marketing/tasks",
            json={"titulo": "Grabar", "content_id": content["id"]},
        ).get_json()["task"]

        self.client.put(
            f"/api/marketing/contents/{content['id']}", json={"estado": "en_revision"}
        )

        detalle = self.client.get(f"/api/marketing/tasks/{tarea['id']}").get_json()
        self.assertEqual(detalle["task"]["estado"], "pendiente")

    def test_actualizacion_parcial_no_borra_lo_demas(self):
        content = self.crear_content(self.campaign["id"], script="Guion original")

        self.client.put(f"/api/marketing/contents/{content['id']}", json={"cta": "Nuevo CTA"})

        detalle = self.client.get(f"/api/marketing/contents/{content['id']}").get_json()
        self.assertEqual(detalle["content"]["script"], "Guion original")
        self.assertEqual(detalle["content"]["cta"], "Nuevo CTA")

    def test_las_comillas_se_guardan_tal_cual(self):
        """El guion es texto que se lee y se copia, no HTML. Si se escapara,
        React pintaría `&quot;` literal en pantalla (React escapa al
        renderizar, nunca desescapa)."""
        content = self.crear_content(
            self.campaign["id"],
            titulo='Reel: "invertir" & ahorrar',
            script='Gancho: "creías que era para ricos" & no lo es',
        )

        self.assertEqual(content["titulo"], 'Reel: "invertir" & ahorrar')
        self.assertNotIn("&quot;", content["script"])
        self.assertNotIn("&amp;", content["script"])

    def test_el_guion_conserva_los_saltos_de_linea(self):
        content = self.crear_content(
            self.campaign["id"],
            script="Plano 1: hucha.\nPlano 2: móvil.\nCierre: CTA.",
        )

        self.assertEqual(content["script"].count("\n"), 2)
        self.assertTrue(content["script"].startswith("Plano 1: hucha."))

    def test_el_titulo_sigue_siendo_de_una_linea(self):
        content = self.crear_content(self.campaign["id"], titulo="Reel\n\nde   octubre")
        self.assertEqual(content["titulo"], "Reel de octubre")

    def test_los_caracteres_de_control_se_descartan(self):
        content = self.crear_content(self.campaign["id"], script="hola\x00\x07mundo")
        self.assertEqual(content["script"], "holamundo")

    def test_content_en_campaign_inexistente_da_404(self):
        respuesta = self.client.post(
            "/api/marketing/campaigns/9999/contents", json={"titulo": "X"}
        )
        self.assertEqual(respuesta.status_code, 404)

    def test_demasiados_responsables_rechazado(self):
        respuesta = self.client.post(
            f"/api/marketing/campaigns/{self.campaign['id']}/contents",
            json={"titulo": "X", "responsables": [f"p{i}@x.com" for i in range(25)]},
        )
        self.assertEqual(respuesta.status_code, 400)


class TaskTests(MarketingTestCase):
    def setUp(self):
        super().setUp()
        self.login()
        self.campaign = self.crear_campaign()
        self.content = self.crear_content(self.campaign["id"])

    def crear_task(self, **campos):
        respuesta = self.client.post(
            "/api/marketing/tasks", json={"titulo": "Escribir guion", **campos}
        )
        self.assertEqual(respuesta.status_code, 201, respuesta.get_json())
        return respuesta.get_json()["task"]

    def test_varios_responsables(self):
        task = self.crear_task(responsables=["abril@x.com", "hugo@x.com", "diego@x.com"])
        self.assertEqual(len(task["responsables"]), 3)

    def test_hora_opcional_se_guarda_y_se_actualiza(self):
        task = self.crear_task(deadline="2026-10-10", hora="09:30")
        self.assertEqual(task["hora"], "09:30")

        respuesta = self.client.put(
            f"/api/marketing/tasks/{task['id']}", json={"hora": "16:00"}
        )
        self.assertEqual(respuesta.status_code, 200)
        detalle = self.client.get(f"/api/marketing/tasks/{task['id']}").get_json()
        self.assertEqual(detalle["task"]["hora"], "16:00")

    def test_sin_hora_se_queda_en_blanco(self):
        task = self.crear_task(deadline="2026-10-10")
        self.assertEqual(task["hora"], "")

    def test_hereda_la_campaign_de_su_content(self):
        task = self.crear_task(content_id=self.content["id"])
        self.assertEqual(task["campaign_id"], self.campaign["id"])

    def test_content_de_otra_campaign_no_puede_desviar_la_tarea(self):
        otra = self.crear_campaign(nombre="Otra campaña")
        task = self.crear_task(content_id=self.content["id"], campaign_id=otra["id"])
        # El content_id manda: la tarea se queda en la campaña de su contenido.
        self.assertEqual(task["campaign_id"], self.campaign["id"])

    def test_tarea_suelta_de_campaign_sin_content(self):
        task = self.crear_task(titulo="Reservar sala", campaign_id=self.campaign["id"])
        self.assertIsNone(task["content_id"])

        detalle = self.client.get(
            f"/api/marketing/campaigns/{self.campaign['id']}"
        ).get_json()
        self.assertEqual(len(detalle["campaign"]["tasks_sueltas"]), 1)

    def test_recorre_sus_estados(self):
        task = self.crear_task()

        for estado in ("en_progreso", "por_revisar", "acabado"):
            respuesta = self.client.put(
                f"/api/marketing/tasks/{task['id']}", json={"estado": estado}
            )
            self.assertEqual(respuesta.status_code, 200)

        detalle = self.client.get(f"/api/marketing/tasks/{task['id']}").get_json()
        self.assertEqual(detalle["task"]["estado"], "acabado")

    def test_estado_invalido_rechazado(self):
        task = self.crear_task()
        respuesta = self.client.put(
            f"/api/marketing/tasks/{task['id']}", json={"estado": "casi"}
        )
        self.assertEqual(respuesta.status_code, 400)

    def test_prioridad_invalida_rechazada(self):
        respuesta = self.client.post(
            "/api/marketing/tasks", json={"titulo": "X", "prioridad": "urgentisima"}
        )
        self.assertEqual(respuesta.status_code, 400)

    def test_checklist_se_normaliza(self):
        task = self.crear_task(
            checklist=[
                {"texto": "Buscar referencias", "hecho": True},
                {"texto": "  ", "hecho": False},  # vacío: se descarta
                {"texto": "Escribir borrador"},   # sin 'hecho': queda en False
            ]
        )
        self.assertEqual(len(task["checklist"]), 2)
        self.assertTrue(task["checklist"][0]["hecho"])
        self.assertFalse(task["checklist"][1]["hecho"])

    def test_checklist_mal_formada_rechazada(self):
        respuesta = self.client.post(
            "/api/marketing/tasks", json={"titulo": "X", "checklist": "no soy lista"}
        )
        self.assertEqual(respuesta.status_code, 400)

    def test_content_inexistente_da_404(self):
        respuesta = self.client.post(
            "/api/marketing/tasks", json={"titulo": "X", "content_id": 9999}
        )
        self.assertEqual(respuesta.status_code, 404)

    def test_id_no_entero_rechazado(self):
        respuesta = self.client.post(
            "/api/marketing/tasks", json={"titulo": "X", "content_id": "1; DROP TABLE tasks"}
        )
        self.assertEqual(respuesta.status_code, 400)

    def test_eliminar(self):
        task = self.crear_task()
        self.assertEqual(
            self.client.delete(f"/api/marketing/tasks/{task['id']}").status_code, 200
        )
        self.assertEqual(
            self.client.get(f"/api/marketing/tasks/{task['id']}").status_code, 404
        )

    def test_borrar_content_se_lleva_sus_tareas(self):
        task = self.crear_task(content_id=self.content["id"])

        self.client.delete(f"/api/marketing/contents/{self.content['id']}")

        self.assertEqual(
            self.client.get(f"/api/marketing/tasks/{task['id']}").status_code, 404
        )


class CalendarioTests(MarketingTestCase):
    def setUp(self):
        super().setUp()
        self.login()
        self.campaign = self.crear_campaign()

    def test_reune_deadlines_y_publicaciones(self):
        self.crear_content(self.campaign["id"], fecha_publicacion="2026-10-15")
        self.client.post(
            "/api/marketing/tasks",
            json={"titulo": "Grabar", "deadline": "2026-10-10",
                  "campaign_id": self.campaign["id"]},
        )

        respuesta = self.client.get(
            "/api/marketing/calendario?desde=2026-10-01&hasta=2026-10-31"
        )
        items = respuesta.get_json()["items"]

        self.assertEqual(len(items), 2)
        self.assertEqual([i["origen"] for i in items], ["task", "content"])
        self.assertEqual(items[0]["fecha"], "2026-10-10")

    def test_incluye_reuniones_con_su_hora(self):
        conn = registros_service._get_connection()
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO reuniones (departamento, titulo, fecha, hora)"
                " VALUES ('marketing', 'Semanal', '2026-10-12', '18:00')"
            )
        conn.commit()
        conn.close()

        self.client.post(
            "/api/marketing/tasks",
            json={"titulo": "Grabar", "deadline": "2026-10-10", "hora": "10:00",
                  "campaign_id": self.campaign["id"]},
        )

        respuesta = self.client.get(
            "/api/marketing/calendario?desde=2026-10-01&hasta=2026-10-31"
        )
        items = respuesta.get_json()["items"]

        reunion = next(i for i in items if i["origen"] == "reunion")
        self.assertEqual(reunion["titulo"], "Semanal")
        self.assertEqual(reunion["hora"], "18:00")

        tarea = next(i for i in items if i["origen"] == "task")
        self.assertEqual(tarea["hora"], "10:00")

    def test_fuera_de_rango_no_aparece(self):
        self.crear_content(self.campaign["id"], fecha_publicacion="2026-12-01")

        respuesta = self.client.get(
            "/api/marketing/calendario?desde=2026-10-01&hasta=2026-10-31"
        )
        self.assertEqual(respuesta.get_json()["items"], [])

    def test_sin_fecha_no_aparece(self):
        self.crear_content(self.campaign["id"])

        respuesta = self.client.get(
            "/api/marketing/calendario?desde=2020-01-01&hasta=2030-01-01"
        )
        self.assertEqual(respuesta.get_json()["items"], [])

    def test_rango_invertido_rechazado(self):
        respuesta = self.client.get(
            "/api/marketing/calendario?desde=2026-10-31&hasta=2026-10-01"
        )
        self.assertEqual(respuesta.status_code, 400)

    def test_sin_parametros_usa_el_mes_en_curso(self):
        respuesta = self.client.get("/api/marketing/calendario")
        datos = respuesta.get_json()

        self.assertEqual(respuesta.status_code, 200)
        self.assertTrue(datos["desde"].endswith("-01"))




class MiembrosTests(MarketingTestCase):
    def test_lista_solo_los_de_marketing_activos(self):
        self.login()
        self.seed_acceso("hugo@example.com", equipos=["marketing", "eventos"])
        self.seed_acceso("solo.eventos@example.com", equipos=["eventos"])

        miembros = self.client.get("/api/marketing/miembros").get_json()["miembros"]
        emails = {m["email"] for m in miembros}

        self.assertEqual(emails, {"marketing@example.com", "hugo@example.com"})

    def test_no_expone_el_hash_de_la_contrasena(self):
        self.login()

        miembros = self.client.get("/api/marketing/miembros").get_json()["miembros"]
        self.assertNotIn("password_hash", miembros[0])


if __name__ == "__main__":
    unittest.main()


class AislamientoDepartamentoTestCase(MarketingTestCase):
    """El mismo blueprint sirve a Marketing y a Eventos (ver `app.py`).

    Lo que estas pruebas vigilan es que compartir rutas no signifique compartir
    datos: cada departamento solo ve y solo toca lo suyo, aunque conozca el id.
    """

    def test_eventos_no_ve_las_campanas_de_marketing(self):
        self.login(equipos=["marketing", "eventos"])
        self.crear_campaign(nombre="Campaña de Marketing")

        respuesta = self.client.get("/api/eventos/campaigns")
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.get_json()["campaigns"], [])

    def test_eventos_no_ve_las_tareas_de_marketing(self):
        self.login(equipos=["marketing", "eventos"])
        self.client.post("/api/marketing/tasks", json={"titulo": "Guion del reel"})

        respuesta = self.client.get("/api/eventos/tasks")
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.get_json()["tasks"], [])

    def test_la_tarea_creada_en_eventos_es_de_eventos(self):
        self.login(equipos=["marketing", "eventos"])
        crear = self.client.post("/api/eventos/tasks", json={"titulo": "Reservar sala"})
        self.assertEqual(crear.status_code, 201, crear.get_json())
        self.assertEqual(crear.get_json()["task"]["departamento"], "eventos")

        propias = self.client.get("/api/eventos/tasks").get_json()["tasks"]
        self.assertEqual([t["titulo"] for t in propias], ["Reservar sala"])
        self.assertEqual(self.client.get("/api/marketing/tasks").get_json()["tasks"], [])

    def test_no_se_edita_una_tarea_de_otro_departamento_por_id(self):
        self.login(equipos=["marketing", "eventos"])
        task_id = self.client.post(
            "/api/marketing/tasks", json={"titulo": "Guion del reel"}
        ).get_json()["task"]["id"]

        # Mismo id, misma sesión, pero por la ruta del otro departamento.
        editar = self.client.put(
            f"/api/eventos/tasks/{task_id}", json={"titulo": "Secuestrada"}
        )
        self.assertEqual(editar.status_code, 404)

        borrar = self.client.delete(f"/api/eventos/tasks/{task_id}")
        self.assertEqual(borrar.status_code, 404)

        leer = self.client.get(f"/api/eventos/tasks/{task_id}")
        self.assertEqual(leer.status_code, 404)

        # Y sigue intacta en el suyo.
        sigue = self.client.get(f"/api/marketing/tasks/{task_id}").get_json()["task"]
        self.assertEqual(sigue["titulo"], "Guion del reel")

    def test_no_se_cuelga_una_tarea_de_una_campana_de_otro_departamento(self):
        self.login(equipos=["marketing", "eventos"])
        campaign_id = self.crear_campaign(nombre="Campaña de Marketing")["id"]

        respuesta = self.client.post(
            "/api/eventos/tasks",
            json={"titulo": "Colada", "campaign_id": campaign_id},
        )
        self.assertEqual(respuesta.status_code, 404)

    def test_estar_en_marketing_no_da_acceso_a_eventos(self):
        self.login(equipos=["marketing"])

        self.assertEqual(self.client.get("/api/eventos/tasks").status_code, 401)
        self.assertEqual(self.client.get("/api/eventos/campaigns").status_code, 401)
        self.assertEqual(self.client.get("/api/marketing/tasks").status_code, 200)

    def test_miembros_son_los_del_departamento_de_la_ruta(self):
        self.login(equipos=["marketing", "eventos"])
        self.seed_acceso("solo-eventos@example.com", "x", ["eventos"])

        de_eventos = self.client.get("/api/eventos/miembros").get_json()["miembros"]
        self.assertIn("solo-eventos@example.com", [m["email"] for m in de_eventos])

        de_marketing = self.client.get("/api/marketing/miembros").get_json()["miembros"]
        self.assertNotIn("solo-eventos@example.com", [m["email"] for m in de_marketing])



class SlackTestCase(MarketingTestCase):
    """Los avisos son best-effort: si Slack falla o no está configurado, la
    operación que los dispara tiene que seguir funcionando igual."""

    def setUp(self):
        super().setUp()
        self.enviados = []
        self._enviar_real = marketing_api_slack.enviar
        marketing_api_slack.enviar = lambda texto: self.enviados.append(texto) or True

    def tearDown(self):
        marketing_api_slack.enviar = self._enviar_real

    def test_crear_una_tarea_avisa_a_slack(self):
        self.login()
        self.client.post(
            "/api/marketing/tasks",
            json={"titulo": "Guion del reel", "responsables": ["diego@telecoemprende.es"]},
        )

        self.assertEqual(len(self.enviados), 1)
        self.assertIn("Guion del reel", self.enviados[0])
        self.assertIn("marketing", self.enviados[0])
        self.assertIn("diego", self.enviados[0])

    def test_cambiar_de_estado_avisa_a_slack(self):
        self.login()
        task_id = self.client.post(
            "/api/marketing/tasks", json={"titulo": "Guion del reel"}
        ).get_json()["task"]["id"]
        self.enviados.clear()

        self.client.put(f"/api/marketing/tasks/{task_id}", json={"estado": "acabado"})

        self.assertEqual(len(self.enviados), 1)
        self.assertIn("Acabado", self.enviados[0])

    def test_editar_sin_tocar_el_estado_no_avisa(self):
        self.login()
        task_id = self.client.post(
            "/api/marketing/tasks", json={"titulo": "Guion del reel"}
        ).get_json()["task"]["id"]
        self.enviados.clear()

        self.client.put(f"/api/marketing/tasks/{task_id}", json={"titulo": "Otro guion"})

        self.assertEqual(self.enviados, [])

    def test_si_slack_falla_la_tarea_se_crea_igual(self):
        def explota(texto):
            raise urllib.error.URLError("slack caído")

        marketing_api_slack.enviar = explota
        self.login()

        # `enviar` traga sus propios errores, así que el fallo real que se
        # simula aquí es el peor caso: que se escape una excepción.
        with self.assertRaises(urllib.error.URLError):
            self.client.post("/api/marketing/tasks", json={"titulo": "Guion del reel"})

        # Y aun así la tarea quedó escrita: el aviso va después del INSERT.
        marketing_api_slack.enviar = lambda texto: True
        tareas = self.client.get("/api/marketing/tasks").get_json()["tasks"]
        self.assertEqual([t["titulo"] for t in tareas], ["Guion del reel"])


class FichaMiembroTestCase(MarketingTestCase):
    """Directorio y ficha: carga de trabajo calculada, perfil guardado."""

    def test_el_directorio_cuenta_las_tareas_abiertas_de_cada_uno(self):
        self.login()
        self.seed_acceso("hugo@telecoemprende.es", "x", ["marketing"])

        self.client.post(
            "/api/marketing/tasks",
            json={"titulo": "Guion", "responsables": ["hugo@telecoemprende.es"]},
        )
        acabada = self.client.post(
            "/api/marketing/tasks",
            json={"titulo": "Reel", "responsables": ["hugo@telecoemprende.es"]},
        ).get_json()["task"]["id"]
        self.client.put(f"/api/marketing/tasks/{acabada}", json={"estado": "acabado"})

        miembros = self.client.get("/api/marketing/miembros").get_json()["miembros"]
        hugo = next(m for m in miembros if m["email"] == "hugo@telecoemprende.es")
        # Solo cuenta lo que sigue abierto: la acabada ya no pesa.
        self.assertEqual(hugo["abiertas"], 1)

    def test_la_carga_no_mezcla_departamentos(self):
        self.login(equipos=["marketing", "eventos"])
        self.seed_acceso("hugo@telecoemprende.es", "x", ["marketing", "eventos"])
        self.client.post(
            "/api/eventos/tasks",
            json={"titulo": "Montaje", "responsables": ["hugo@telecoemprende.es"]},
        )

        en_marketing = self.client.get("/api/marketing/miembros").get_json()["miembros"]
        hugo = next(m for m in en_marketing if m["email"] == "hugo@telecoemprende.es")
        self.assertEqual(hugo["abiertas"], 0)

        en_eventos = self.client.get("/api/eventos/miembros").get_json()["miembros"]
        hugo = next(m for m in en_eventos if m["email"] == "hugo@telecoemprende.es")
        self.assertEqual(hugo["abiertas"], 1)

    def test_la_ficha_trae_totales_y_actividad(self):
        self.login()
        self.seed_acceso("hugo@telecoemprende.es", "x", ["marketing"])
        campaign_id = self.crear_campaign()["id"]
        self.client.post(
            "/api/marketing/tasks",
            json={
                "titulo": "Guion del reel",
                "campaign_id": campaign_id,
                "responsables": ["hugo@telecoemprende.es"],
            },
        )

        ficha = self.client.get(
            "/api/marketing/miembros/ficha?email=hugo@telecoemprende.es"
        ).get_json()["ficha"]

        self.assertEqual(ficha["abiertas"], 1)
        self.assertEqual(ficha["completadas"], 0)
        self.assertEqual(ficha["campanas"], 1)
        self.assertEqual([a["titulo"] for a in ficha["actividad"]], ["Guion del reel"])

    def test_se_guardan_etiquetas_y_nota(self):
        self.login()
        self.seed_acceso("hugo@telecoemprende.es", "x", ["marketing"])

        guardar = self.client.put(
            "/api/marketing/miembros/ficha",
            json={
                "email": "hugo@telecoemprende.es",
                "tags": ["Reels", "Fotografía", "  "],
                "notas": "Mejor una cosa a la vez.",
            },
        )
        self.assertEqual(guardar.status_code, 200)

        ficha = self.client.get(
            "/api/marketing/miembros/ficha?email=hugo@telecoemprende.es"
        ).get_json()["ficha"]
        # La etiqueta en blanco se descarta y el resto queda ordenado.
        self.assertEqual(ficha["tags"], ["Fotografía", "Reels"])
        self.assertEqual(ficha["notas"], "Mejor una cosa a la vez.")

    def test_no_se_lee_la_ficha_de_alguien_de_otro_departamento(self):
        self.login(equipos=["marketing"])
        self.seed_acceso("solo-eventos@example.com", "x", ["eventos"])

        leer = self.client.get(
            "/api/marketing/miembros/ficha?email=solo-eventos@example.com"
        )
        self.assertEqual(leer.status_code, 404)

        escribir = self.client.put(
            "/api/marketing/miembros/ficha",
            json={"email": "solo-eventos@example.com", "notas": "colada"},
        )
        self.assertEqual(escribir.status_code, 404)
