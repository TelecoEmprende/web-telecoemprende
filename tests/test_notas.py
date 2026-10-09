"""Notas: lo que se prueba es quién ve qué (club, departamento, privada), que
no se pueda escribir fuera de tus departamentos, que un enlace peligroso no
entre en una nota y que las casillas sin marcar lleguen al resumen."""

import os
import unittest

os.environ["DATABASE_URL"] = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql://telecoemprende:telecoemprende@localhost:5432/telecoemprende_test",
)
os.environ["CRON_SECRET"] = "test-cron-secret"
os.environ["SLACK_SIGNING_SECRET"] = "test-signing-secret"

import app  # noqa: E402
import backend.services.equipo as equipo_service  # noqa: E402
import backend.services.notas as notas_service  # noqa: E402
import backend.services.security as security_service  # noqa: E402
from werkzeug.security import generate_password_hash  # noqa: E402
from backend.services.db import migrar  # noqa: E402

DOC = [
    {"type": "heading", "content": [{"type": "text", "text": "Orden del día"}]},
    {"type": "checkListItem", "props": {"checked": False}, "content": [{"type": "text", "text": "Sponsor"}]},
    {"type": "checkListItem", "props": {"checked": True}, "content": [{"type": "text", "text": "Sala"}]},
]


class NotasTestCase(unittest.TestCase):
    def setUp(self):
        security_service.request_log.clear()
        migrar()
        conn = notas_service._get_connection()
        with conn.cursor() as cur:
            cur.execute("DELETE FROM notas")
            cur.execute("DELETE FROM equipo_accesos")
            for email, equipos in (
                ("ana@example.com", ["marketing"]),
                ("bea@example.com", ["marketing"]),
                ("carlos@example.com", ["eventos"]),
            ):
                cur.execute(
                    "INSERT INTO equipo_accesos (email, password_hash, equipos) VALUES (%s, %s, %s)",
                    (email, generate_password_hash("pw"), equipos),
                )
        conn.commit()
        conn.close()
        app.app.config["TESTING"] = True

    def como(self, email):
        cliente = app.app.test_client()
        r = cliente.post("/api/equipo/login", json={"email": email, "password": "pw"})
        self.assertEqual(r.status_code, 200, r.get_json())
        return cliente

    def test_sin_sesion_no_hay_nada(self):
        self.assertEqual(app.app.test_client().get("/api/equipo/notas").status_code, 401)

    def test_visibilidad_de_notas(self):
        ana, bea, carlos = self.como("ana@example.com"), self.como("bea@example.com"), self.como("carlos@example.com")
        ana.post("/api/equipo/notas", json={"titulo": "Club", "contenido": DOC})
        ana.post("/api/equipo/notas", json={"titulo": "Mkt", "departamento": "marketing", "contenido": []})
        ana.post("/api/equipo/notas", json={"titulo": "Mía", "privada": True, "contenido": []})

        titulos = lambda c: sorted(n["titulo"] for n in c.get("/api/equipo/notas").get_json()["notas"])  # noqa: E731
        self.assertEqual(titulos(ana), ["Club", "Mkt", "Mía"])
        self.assertEqual(titulos(bea), ["Club", "Mkt"])
        self.assertEqual(titulos(carlos), ["Club"])

        club = next(n for n in ana.get("/api/equipo/notas").get_json()["notas"] if n["titulo"] == "Club")
        self.assertEqual((club["checks_pendientes"], club["checks_hechos"]), (1, 1))
        self.assertEqual(club["pendientes"], ["Sponsor"])
        self.assertIn("Orden del día", club["resumen"])
        self.assertNotIn("contenido", club)

    def test_no_se_escribe_fuera_de_tus_departamentos(self):
        ana, carlos = self.como("ana@example.com"), self.como("carlos@example.com")
        r = ana.post("/api/equipo/notas", json={"titulo": "x", "departamento": "eventos", "contenido": []})
        self.assertEqual(r.status_code, 400)

        nota_id = ana.post(
            "/api/equipo/notas", json={"titulo": "Mkt", "departamento": "marketing", "contenido": []}
        ).get_json()["nota"]["id"]
        self.assertEqual(carlos.put(f"/api/equipo/notas/{nota_id}", json={"titulo": "hack"}).status_code, 404)
        self.assertEqual(carlos.delete(f"/api/equipo/notas/{nota_id}").status_code, 404)
        self.assertEqual(carlos.get(f"/api/equipo/notas/{nota_id}").status_code, 404)

    def test_solo_el_autor_cambia_la_privacidad(self):
        ana, bea = self.como("ana@example.com"), self.como("bea@example.com")
        nota_id = ana.post("/api/equipo/notas", json={"titulo": "Club", "contenido": []}).get_json()["nota"]["id"]
        self.assertEqual(bea.put(f"/api/equipo/notas/{nota_id}", json={"privada": True}).status_code, 404)
        self.assertEqual(bea.put(f"/api/equipo/notas/{nota_id}", json={"titulo": "Editada"}).status_code, 200)
        nota = ana.get(f"/api/equipo/notas/{nota_id}").get_json()["nota"]
        self.assertEqual((nota["titulo"], nota["editado_por"], nota["privada"]), ("Editada", "bea@example.com", False))

    def test_enlaces_peligrosos_rechazados(self):
        ana = self.como("ana@example.com")
        malo = [{"type": "paragraph", "content": [
            {"type": "link", "href": "javascript:alert(1)", "content": [{"type": "text", "text": "x"}]},
        ]}]
        self.assertEqual(ana.post("/api/equipo/notas", json={"contenido": malo}).status_code, 400)
        imagen = [{"type": "image", "props": {"url": "data:text/html,hola"}}]
        self.assertEqual(ana.post("/api/equipo/notas", json={"contenido": imagen}).status_code, 400)
        bueno = [{"type": "paragraph", "content": [
            {"type": "link", "href": "https://telecoemprende.es", "content": [{"type": "text", "text": "web"}]},
        ]}]
        self.assertEqual(ana.post("/api/equipo/notas", json={"contenido": bueno}).status_code, 201)


    def test_notas_enlazadas_a_un_proyecto(self):
        import backend.services.marketing as marketing_service

        migrar()
        conn = notas_service._get_connection()
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO campaigns (nombre, departamento) VALUES ('Charla YC', 'marketing') RETURNING id"
            )
            proyecto = cur.fetchone()[0]
        conn.commit()
        conn.close()

        ana = self.como("ana@example.com")
        enlazada = ana.post(
            "/api/equipo/notas", json={"titulo": "Guion", "contenido": [], "proyecto_id": proyecto}
        ).get_json()["nota"]
        ana.post("/api/equipo/notas", json={"titulo": "Suelta", "contenido": []})
        self.assertEqual(enlazada["proyecto_id"], proyecto)

        enlaces = lambda: {n["titulo"]: n["proyecto_id"] for n in ana.get("/api/equipo/notas").get_json()["notas"]}  # noqa: E731
        self.assertEqual(enlaces(), {"Guion": proyecto, "Suelta": None})

        # Un proyecto que no existe no se puede enlazar; null desenlaza.
        malo = ana.put(f"/api/equipo/notas/{enlazada['id']}", json={"proyecto_id": 999999})
        self.assertEqual(malo.status_code, 400)
        ana.put(f"/api/equipo/notas/{enlazada['id']}", json={"proyecto_id": None})
        self.assertEqual(enlaces()["Guion"], None)


if __name__ == "__main__":
    unittest.main()
