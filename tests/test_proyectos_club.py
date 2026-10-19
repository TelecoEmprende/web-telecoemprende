"""Proyectos de todo el club: ámbito, responsable y estado, historial de
cambios, papelera (borrar y restaurar), Mesa del club y los avisos del cron."""

import os
import unittest
from datetime import date, timedelta
from unittest.mock import patch

os.environ["DATABASE_URL"] = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql://telecoemprende:telecoemprende@localhost:5432/telecoemprende_test",
)
os.environ["CRON_SECRET"] = "test-cron-secret"

import test_marketing as base  # noqa: E402
from backend.services import historial  # noqa: E402


class ProyectosClubTestCase(base.MarketingTestCase):
    def setUp(self):
        super().setUp()
        conn = base.marketing_service._get_connection()
        with conn.cursor() as cur:
            cur.execute("DELETE FROM history")
            cur.execute("DELETE FROM notes")
        conn.commit()
        conn.close()
        # VP de todo: estas pruebas no ejercitan el límite de repartir tareas.
        self.login(equipos=["marketing", "eventos", "ingenieria"])

    def tarea(self, depto="marketing", **extra):
        respuesta = self.client.post(
            f"/api/{depto}/tasks", json={"titulo": "Montar stand", "instrucciones": "Ver notas.", **extra}
        )
        self.assertEqual(respuesta.status_code, 201, respuesta.get_json())
        return respuesta.get_json()["task"]

    def eventos(self, **filtros):
        qs = "&".join(f"{k}={v}" for k, v in filtros.items())
        return self.client.get(f"/api/equipo/historial?{qs}").get_json()["eventos"]


class AmbitoTests(ProyectosClubTestCase):
    def test_un_proyecto_de_todo_el_club_se_ve_desde_los_tres_departamentos(self):
        proyecto = self.crear_campaign(
            nombre="Feria de empleo", departamentos=["marketing", "eventos", "ingenieria"]
        )
        self.assertEqual(proyecto["departamentos"], ["marketing", "eventos", "ingenieria"])

        for depto in ("marketing", "eventos", "ingenieria"):
            nombres = [c["nombre"] for c in self.client.get(f"/api/{depto}/campaigns").get_json()["campaigns"]]
            self.assertEqual(nombres, ["Feria de empleo"], depto)

    def test_varios_departamentos_en_una_peticion_cada_proyecto_una_vez(self):
        club = self.crear_campaign(nombre="Feria", departamentos=["marketing", "eventos", "ingenieria"])
        self.crear_campaign(nombre="Reels")  # solo marketing
        self.crear_campaign(nombre="Hackathon", departamentos=["ingenieria"])
        hecha = self.tarea(campaign_id=club["id"])
        self.tarea(campaign_id=club["id"])
        self.client.put(f"/api/marketing/tasks/{hecha['id']}", json={"estado": "acabado"})
        self.client.delete(f"/api/marketing/tasks/{self.tarea(campaign_id=club['id'])['id']}")

        campaigns = self.client.get("/api/marketing/campaigns?deptos=marketing,eventos").get_json()["campaigns"]
        self.assertEqual(sorted(c["nombre"] for c in campaigns), ["Feria", "Reels"])
        feria = next(c for c in campaigns if c["nombre"] == "Feria")
        # La borrada (en la papelera) no cuenta.
        self.assertEqual((feria["total_tasks"], feria["tareas_acabadas"]), (2, 1))

        self.assertEqual(self.client.get("/api/marketing/campaigns?deptos=marketing,nada").status_code, 400)

    def test_un_proyecto_de_un_departamento_solo_sale_en_el_suyo(self):
        self.crear_campaign(nombre="Reels de otoño")  # por defecto, el de la ruta

        self.assertEqual(len(self.client.get("/api/marketing/campaigns").get_json()["campaigns"]), 1)
        self.assertEqual(self.client.get("/api/eventos/campaigns").get_json()["campaigns"], [])

    def test_el_ambito_se_cambia_y_se_valida(self):
        proyecto = self.crear_campaign(nombre="Hackathon")
        editar = self.client.put(
            f"/api/marketing/campaigns/{proyecto['id']}", json={"departamentos": ["marketing", "ingenieria"]}
        )
        self.assertEqual(editar.status_code, 200)
        self.assertEqual(len(self.client.get("/api/ingenieria/campaigns").get_json()["campaigns"]), 1)

        for malo in ([], ["no-existe"], "marketing"):
            respuesta = self.client.put(
                f"/api/marketing/campaigns/{proyecto['id']}", json={"departamentos": malo}
            )
            self.assertEqual(respuesta.status_code, 400, malo)

    def test_una_tarea_se_cuelga_de_un_proyecto_que_incluye_su_departamento(self):
        club = self.crear_campaign(nombre="Feria", departamentos=["marketing", "eventos", "ingenieria"])
        propio = self.crear_campaign(nombre="Solo marketing")

        en_eventos = self.tarea("eventos", campaign_id=club["id"])
        self.assertEqual(en_eventos["campaign_id"], club["id"])
        ajena = self.client.post(
            "/api/eventos/tasks",
            json={"titulo": "Colada", "instrucciones": "Ver notas.", "campaign_id": propio["id"]},
        )
        self.assertEqual(ajena.status_code, 404)

    def test_responsable_y_estado_del_proyecto(self):
        self.seed_acceso("ana@example.com")
        proyecto = self.crear_campaign(nombre="Charla alumni", estado="idea", responsable="ana@example.com")
        self.assertEqual((proyecto["estado"], proyecto["responsable"]), ("idea", "ana@example.com"))

        self.client.put(
            f"/api/marketing/campaigns/{proyecto['id']}", json={"estado": "pausado", "responsable": ""}
        )
        leido = self.client.get(f"/api/marketing/campaigns/{proyecto['id']}").get_json()["campaign"]
        self.assertEqual((leido["estado"], leido["responsable"]), ("pausado", ""))

        malo = self.client.put(f"/api/marketing/campaigns/{proyecto['id']}", json={"estado": "volando"})
        self.assertEqual(malo.status_code, 400)
        sin_cuenta = self.client.put(
            f"/api/marketing/campaigns/{proyecto['id']}", json={"responsable": "nadie@example.com"}
        )
        self.assertEqual(sin_cuenta.status_code, 400)


class HistorialTests(ProyectosClubTestCase):
    def test_crear_y_editar_quedan_apuntados_con_el_antes_y_el_despues(self):
        proyecto = self.crear_campaign(nombre="Charla")
        self.client.put(
            f"/api/marketing/campaigns/{proyecto['id']}", json={"nombre": "Charla de alumni", "estado": "pausado"}
        )

        eventos = self.eventos(entidad="proyecto", id=proyecto["id"])
        self.assertEqual([e["accion"] for e in eventos], ["editar", "crear"])
        cambios = {c["campo"]: (c["antes"], c["despues"]) for c in eventos[0]["cambios"]}
        self.assertEqual(cambios["nombre"], ("Charla", "Charla de alumni"))
        self.assertEqual(cambios["estado"], ("activo", "pausado"))
        self.assertEqual(eventos[0]["persona"], "marketing@example.com")

    def test_guardar_sin_cambiar_nada_no_ensucia_el_historial(self):
        tarea = self.tarea()
        self.client.put(f"/api/marketing/tasks/{tarea['id']}", json={"titulo": "Montar stand", "estado": "pendiente"})
        self.assertEqual([e["accion"] for e in self.eventos(entidad="tarea", id=tarea["id"])], ["crear"])

    def test_el_historial_del_proyecto_incluye_sus_entregables_y_tareas(self):
        proyecto = self.crear_campaign(nombre="Feria")
        contenido = self.crear_content(proyecto["id"], titulo="Cartel")
        tarea = self.tarea(campaign_id=proyecto["id"])
        self.client.put(f"/api/marketing/tasks/{tarea['id']}", json={"estado": "acabado"})

        eventos = self.eventos(proyecto_id=proyecto["id"])
        vistos = {(e["entidad"], e["accion"]) for e in eventos}
        self.assertEqual(
            vistos,
            {("proyecto", "crear"), ("entregable", "crear"), ("tarea", "crear"), ("tarea", "editar")},
        )
        self.assertTrue(all(e["proyecto_id"] == proyecto["id"] for e in eventos if e["entidad"] != "proyecto"))
        self.assertEqual(contenido["titulo"], "Cartel")

    def test_las_responsables_cambian_con_emails_en_el_historial(self):
        self.seed_acceso("ana@example.com")
        tarea = self.tarea()
        self.client.put(f"/api/marketing/tasks/{tarea['id']}", json={"responsables": ["ana@example.com"]})

        cambio = self.eventos(entidad="tarea", id=tarea["id"])[0]["cambios"][0]
        self.assertEqual(cambio, {"campo": "responsables", "antes": [], "despues": ["ana@example.com"]})

    def test_el_historial_de_una_nota_privada_no_sale_a_nadie_mas(self):
        nota = self.client.post(
            "/api/equipo/notas", json={"titulo": "Mía", "privada": True, "contenido": []}
        ).get_json()["nota"]
        self.assertEqual(len(self.eventos(entidad="nota", id=nota["id"])), 1)

        self.client.post("/api/equipo/logout")
        self.login(email="otra@example.com")
        self.assertEqual(self.eventos(entidad="nota", id=nota["id"]), [])
        self.assertEqual([e for e in self.eventos() if e["entidad"] == "nota"], [])

    def test_las_ediciones_seguidas_de_una_nota_se_agrupan(self):
        nota = self.client.post("/api/equipo/notas", json={"titulo": "Acta", "contenido": []}).get_json()["nota"]
        for texto in ("a", "ab", "abc"):
            bloques = [{"type": "paragraph", "content": [{"type": "text", "text": texto}]}]
            self.client.put(f"/api/equipo/notas/{nota['id']}", json={"contenido": bloques})

        acciones = [e["accion"] for e in self.eventos(entidad="nota", id=nota["id"])]
        self.assertEqual(acciones, ["editar", "crear"])


class PapeleraTests(ProyectosClubTestCase):
    def papelera(self):
        return self.client.get("/api/equipo/papelera").get_json()["elementos"]

    def test_borrar_manda_a_la_papelera_y_se_restaura(self):
        tarea = self.tarea()
        self.assertEqual(self.client.delete(f"/api/marketing/tasks/{tarea['id']}").status_code, 200)

        self.assertEqual(self.client.get("/api/marketing/tasks").get_json()["tasks"], [])
        self.assertEqual(self.client.get(f"/api/marketing/tasks/{tarea['id']}").status_code, 404)
        self.assertEqual([(e["entidad"], e["titulo"]) for e in self.papelera()], [("tarea", "Montar stand")])

        restaurar = self.client.post(f"/api/equipo/papelera/tarea/{tarea['id']}/restaurar")
        self.assertEqual(restaurar.status_code, 200)
        self.assertEqual(len(self.client.get("/api/marketing/tasks").get_json()["tasks"]), 1)
        self.assertEqual(self.papelera(), [])
        self.assertEqual(
            [e["accion"] for e in self.eventos(entidad="tarea", id=tarea["id"])],
            ["restaurar", "borrar", "crear"],
        )

    def test_lo_borrado_no_se_edita_ni_cuenta_en_la_carga(self):
        self.seed_acceso("ana@example.com")
        tarea = self.tarea(responsables=["ana@example.com"])
        self.client.delete(f"/api/marketing/tasks/{tarea['id']}")

        editar = self.client.put(f"/api/marketing/tasks/{tarea['id']}", json={"titulo": "Zombi"})
        self.assertEqual(editar.status_code, 404)
        miembros = self.client.get("/api/equipo/miembros").get_json()["miembros"]
        self.assertEqual(next(m for m in miembros if m["email"] == "ana@example.com")["abiertas"], 0)
        self.assertEqual(self.client.delete(f"/api/marketing/tasks/{tarea['id']}").status_code, 404)

    def test_un_proyecto_se_lleva_y_devuelve_sus_entregables_y_tareas(self):
        proyecto = self.crear_campaign(nombre="Feria")
        contenido = self.crear_content(proyecto["id"], titulo="Cartel")
        dentro = self.tarea(campaign_id=proyecto["id"], content_id=contenido["id"])
        suelta = self.tarea()
        # Esta se borró antes, aparte: no tiene que volver con el proyecto.
        previa = self.tarea(campaign_id=proyecto["id"], titulo="Vieja")
        self.client.delete(f"/api/marketing/tasks/{previa['id']}")

        self.client.delete(f"/api/marketing/campaigns/{proyecto['id']}")
        # En la papelera solo asoma lo que se borró por su cuenta.
        self.assertEqual(
            sorted((e["entidad"], e["titulo"]) for e in self.papelera()),
            [("proyecto", "Feria"), ("tarea", "Vieja")],
        )
        self.assertEqual([t["id"] for t in self.client.get("/api/marketing/tasks").get_json()["tasks"]], [suelta["id"]])

        self.client.post(f"/api/equipo/papelera/proyecto/{proyecto['id']}/restaurar")
        ids = sorted(t["id"] for t in self.client.get("/api/marketing/tasks").get_json()["tasks"])
        self.assertEqual(ids, sorted([dentro["id"], suelta["id"]]))
        detalle = self.client.get(f"/api/marketing/campaigns/{proyecto['id']}").get_json()["campaign"]
        self.assertEqual([c["titulo"] for c in detalle["contents"]], ["Cartel"])

    def test_no_se_restaura_algo_dentro_de_un_proyecto_que_sigue_borrado(self):
        proyecto = self.crear_campaign(nombre="Feria")
        contenido = self.crear_content(proyecto["id"], titulo="Cartel")
        self.client.delete(f"/api/marketing/contents/{contenido['id']}")
        self.client.delete(f"/api/marketing/campaigns/{proyecto['id']}")

        respuesta = self.client.post(f"/api/equipo/papelera/entregable/{contenido['id']}/restaurar")
        self.assertEqual(respuesta.status_code, 400)
        self.assertIn("Feria", respuesta.get_json()["message"])

    def test_solo_un_admin_borra_para_siempre(self):
        tarea = self.tarea()
        self.client.delete(f"/api/marketing/tasks/{tarea['id']}")

        self.assertEqual(self.client.delete(f"/api/equipo/papelera/tarea/{tarea['id']}").status_code, 403)
        with self.client.session_transaction() as s:
            s["admin_auth"] = True
        self.assertEqual(self.client.delete(f"/api/equipo/papelera/tarea/{tarea['id']}").status_code, 200)
        self.assertEqual(self.papelera(), [])
        self.assertEqual(self.client.post(f"/api/equipo/papelera/tarea/{tarea['id']}/restaurar").status_code, 404)

    def test_la_papelera_se_vacia_a_los_30_dias(self):
        vieja, reciente = self.tarea(titulo="Vieja"), self.tarea(titulo="Reciente")
        for t in (vieja, reciente):
            self.client.delete(f"/api/marketing/tasks/{t['id']}")
        conn = base.marketing_service._get_connection()
        with conn.cursor() as cur:
            cur.execute("UPDATE tasks SET deleted_at = NOW() - interval '31 days' WHERE id = %s", (vieja["id"],))
        conn.commit()
        conn.close()

        self.assertEqual([e["titulo"] for e in self.papelera()], ["Reciente"])
        self.assertEqual(historial.vaciar_papelera(), 1)
        conn = base.marketing_service._get_connection()
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM tasks")
            self.assertEqual([f[0] for f in cur.fetchall()], [reciente["id"]])
        conn.close()

    def test_las_notas_privadas_borradas_solo_las_ve_su_autor(self):
        nota = self.client.post(
            "/api/equipo/notas", json={"titulo": "Mía", "privada": True, "contenido": []}
        ).get_json()["nota"]
        compartida = self.client.post(
            "/api/equipo/notas", json={"titulo": "De todos", "contenido": []}
        ).get_json()["nota"]
        for n in (nota, compartida):
            self.client.delete(f"/api/equipo/notas/{n['id']}")
        self.assertEqual(sorted(e["titulo"] for e in self.papelera()), ["De todos", "Mía"])

        self.client.post("/api/equipo/logout")
        self.login(email="otra@example.com")
        self.assertEqual([e["titulo"] for e in self.papelera()], ["De todos"])
        self.assertEqual(self.client.post(f"/api/equipo/papelera/nota/{nota['id']}/restaurar").status_code, 404)
        self.assertEqual(self.client.post(f"/api/equipo/papelera/nota/{compartida['id']}/restaurar").status_code, 200)

    def test_una_reunion_con_su_acta_tambien_se_restaura(self):
        acta = [{"type": "paragraph", "content": [{"type": "text", "text": "Se acordó la feria"}]}]
        fila = self.client.post(
            "/api/eventos/reuniones", json={"titulo": "Semanal", "club": True, "contenido": acta}
        ).get_json()["registro"]
        self.assertEqual(self.client.delete(f"/api/eventos/reuniones/{fila['id']}").status_code, 200)

        self.assertEqual(self.client.get("/api/eventos/reuniones").get_json()["reuniones"], [])
        self.assertEqual([(e["entidad"], e["titulo"]) for e in self.papelera()], [("reunion", "Semanal")])
        self.assertEqual(self.client.post(f"/api/equipo/papelera/reunion/{fila['id']}/restaurar").status_code, 200)
        vuelta = self.client.get("/api/ingenieria/reuniones").get_json()["reuniones"]
        self.assertEqual([r["contenido"] for r in vuelta], [acta])
        self.assertEqual(
            [e["accion"] for e in self.eventos(entidad="reunion", id=fila["id"])],
            ["restaurar", "borrar", "crear"],
        )

    def test_requiere_sesion(self):
        self.client.post("/api/equipo/logout")
        for ruta in ("/api/equipo/papelera", "/api/equipo/historial", "/api/equipo/mesa"):
            self.assertEqual(self.client.get(ruta).status_code, 401, ruta)


class MesaTests(ProyectosClubTestCase):
    def mesa(self):
        return self.client.get("/api/equipo/mesa").get_json()

    def test_proyectos_vivos_con_responsable_progreso_y_siguiente_paso(self):
        self.seed_acceso("ana@example.com")
        viva = self.crear_campaign(nombre="Feria", responsable="ana@example.com")
        self.crear_campaign(nombre="Cerrada", estado="cerrado")
        archivada = self.crear_campaign(nombre="Archivada")
        self.client.put(f"/api/marketing/campaigns/{archivada['id']}", json={"archivado": True})
        manana = (date.today() + timedelta(days=1)).isoformat()
        self.tarea(campaign_id=viva["id"], titulo="Imprimir", deadline=manana, responsables=["ana@example.com"])
        hecha = self.tarea(campaign_id=viva["id"], titulo="Diseñar")
        self.client.put(f"/api/marketing/tasks/{hecha['id']}", json={"estado": "acabado"})

        proyectos = self.mesa()["mesa"]["proyectos"]
        self.assertEqual([p["nombre"] for p in proyectos], ["Feria"])
        feria = proyectos[0]
        self.assertEqual((feria["total_tasks"], feria["tareas_acabadas"]), (2, 1))
        self.assertEqual(feria["siguiente_titulo"], "Imprimir")
        self.assertEqual(feria["siguiente_responsables"], ["ana@example.com"])
        self.assertFalse(feria["estancado"])

    def test_cada_proyecto_trae_sus_fases_con_progreso(self):
        proyecto = self.crear_campaign(nombre="Feria")
        fase = self.crear_content(proyecto["id"], titulo="Cartel")
        hecha = self.tarea(campaign_id=proyecto["id"], content_id=fase["id"])
        self.tarea(campaign_id=proyecto["id"], content_id=fase["id"])
        self.client.put(f"/api/marketing/tasks/{hecha['id']}", json={"estado": "acabado"})

        fases = self.mesa()["mesa"]["proyectos"][0]["entregables"]
        self.assertEqual([(f["titulo"], f["acabadas"], f["total"]) for f in fases], [("Cartel", 1, 2)])

    def test_por_persona_lo_abierto_de_cada_uno_y_quien_esta_libre(self):
        self.seed_acceso("ana@example.com")
        self.seed_acceso("libre@example.com")
        ayer = (date.today() - timedelta(days=1)).isoformat()
        self.tarea(titulo="Vencida", deadline=ayer, responsables=["ana@example.com"])
        self.tarea(titulo="Sin fecha", responsables=["ana@example.com"])
        hecha = self.tarea(titulo="Hecha", responsables=["ana@example.com"])
        self.client.put(f"/api/marketing/tasks/{hecha['id']}", json={"estado": "acabado"})

        personas = {p["email"]: p for p in self.mesa()["mesa"]["personas"]}
        self.assertEqual([t["titulo"] for t in personas["ana@example.com"]["tareas"]], ["Vencida", "Sin fecha"])
        self.assertEqual(personas["ana@example.com"]["atrasadas"], 1)
        self.assertEqual(personas["libre@example.com"]["tareas"], [])
        self.assertEqual(self.mesa()["mesa"]["personas"][0]["email"], "ana@example.com")

    def test_tareas_sin_dueno_y_atrasadas(self):
        ayer = (date.today() - timedelta(days=1)).isoformat()
        self.tarea(titulo="Sin dueño")
        self.tarea(titulo="Vencida", deadline=ayer, responsables=["marketing@example.com"])

        mesa = self.mesa()["mesa"]
        self.assertEqual([t["titulo"] for t in mesa["sin_dueno"]], ["Sin dueño"])
        self.assertEqual([t["titulo"] for t in mesa["atrasadas"]], ["Vencida"])

    def test_un_proyecto_activo_que_no_se_mueve_sale_estancado(self):
        proyecto = self.crear_campaign(nombre="Dormido")
        pausado = self.crear_campaign(nombre="En pausa", estado="pausado")
        conn = base.marketing_service._get_connection()
        with conn.cursor() as cur:
            cur.execute("UPDATE projects SET updated_at = NOW() - interval '20 days'")
        conn.commit()
        conn.close()

        mesa = self.mesa()["mesa"]
        por_nombre = {p["nombre"]: p for p in mesa["proyectos"]}
        self.assertTrue(por_nombre["Dormido"]["estancado"])
        self.assertFalse(por_nombre["En pausa"]["estancado"])
        self.assertEqual(mesa["estancados"], 1)
        self.assertEqual(mesa["sin_responsable"], 2)
        self.assertEqual((proyecto["nombre"], pausado["estado"]), ("Dormido", "pausado"))

    def test_trae_la_actividad_reciente_del_club(self):
        self.crear_campaign(nombre="Feria")
        actividad = self.mesa()["actividad"]
        self.assertEqual([(a["entidad"], a["accion"], a["titulo"]) for a in actividad], [("proyecto", "crear", "Feria")])


class CronMesaTests(ProyectosClubTestCase):
    HEADERS = {"Authorization": "Bearer test-cron-secret"}

    def test_el_resumen_del_lunes_cuenta_lo_atrasado_lo_sin_dueno_y_lo_estancado(self):
        self.tarea(titulo="Sin dueño")
        mensajes = []
        with patch("backend.services.slack.enviar", side_effect=lambda t: mensajes.append(t) or True), patch(
            "backend.api.cron.resumen_salud_equipo", return_value=True
        ):
            respuesta = self.client.post("/api/cron/resumen-equipo", headers=self.HEADERS)
        self.assertEqual(respuesta.status_code, 200)
        self.assertTrue(respuesta.get_json()["mesa"])
        self.assertIn("Sin dueño", mensajes[0])
        self.assertIn("sin dueño", mensajes[0])

    def test_sin_nada_que_contar_no_manda_el_resumen(self):
        with patch("backend.services.slack.enviar") as enviar, patch(
            "backend.api.cron.resumen_salud_equipo", return_value=True
        ):
            respuesta = self.client.post("/api/cron/resumen-equipo", headers=self.HEADERS)
        self.assertFalse(respuesta.get_json()["mesa"])
        enviar.assert_not_called()

    def test_el_cron_diario_vacia_la_papelera_vieja(self):
        tarea = self.tarea()
        self.client.delete(f"/api/marketing/tasks/{tarea['id']}")
        conn = base.marketing_service._get_connection()
        with conn.cursor() as cur:
            cur.execute("UPDATE tasks SET deleted_at = NOW() - interval '40 days'")
        conn.commit()
        conn.close()

        with patch("backend.api.cron.aviso_deadlines_manana", return_value=False):
            respuesta = self.client.post("/api/cron/avisar-deadlines", headers=self.HEADERS)
        self.assertEqual(respuesta.get_json()["vaciadas"], 1)


if __name__ == "__main__":
    unittest.main()
