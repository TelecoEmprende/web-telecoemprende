"""Sección «Equipo» de la web pública (GET /api/equipo/miembros-web).

Sale de `equipo_accesos`, la misma fila que /equipo: salen las cuentas
marcadas `en_web` que tienen foto, con nombre y primer apellido.
"""

import base64
import os
import unittest

os.environ["DATABASE_URL"] = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql://telecoemprende:telecoemprende@localhost:5432/telecoemprende_test",
)

import app  # noqa: E402
import backend.services.equipo as equipo_service  # noqa: E402
from backend.services.db import migrar  # noqa: E402

FOTO = "data:image/png;base64,iVBORw0KGgo="


class MiembrosWebTestCase(unittest.TestCase):
    def setUp(self):
        migrar()
        conn = equipo_service._get_connection()
        with conn.cursor() as cur:
            cur.execute("DELETE FROM members")
        conn.commit()
        conn.close()
        app.app.config["TESTING"] = True
        self.client = app.app.test_client()

    def alta(self, email, nombre, equipos, en_web=True, **campos):
        acceso = equipo_service.crear_equipo_acceso(
            email, "contrasena-larga", equipos, nombre=nombre,
            vp_de=campos.pop("vp_de", None), cargo=campos.pop("cargo", ""),
        )
        equipo_service.actualizar_equipo_acceso(acceso["id"], en_web=en_web, **campos)
        return acceso

    def miembros(self):
        respuesta = self.client.get("/api/equipo/miembros-web")
        self.assertEqual(respuesta.status_code, 200)
        return respuesta.get_json()["miembros"]

    def test_solo_salen_los_marcados_con_foto_y_sin_datos_privados(self):
        ana = self.alta("ana@example.com", "Ana", ["marketing", "eventos"], apellidos="García López", foto=FOTO)
        self.alta("oculto@example.com", "Oculto", ["eventos", "marketing"], en_web=False, foto=FOTO)
        self.alta("sinfoto@example.com", "Sin", ["eventos", "marketing"])

        self.assertEqual(
            self.miembros(),
            [{
                "nombre": "Ana", "apellido": "García", "foto": equipo_service.url_foto(ana["id"], FOTO),
                "puesto": None, "linkedin": "",
            }],
        )

    def test_orden_presidencia_board_vps_y_resto(self):
        self.alta("m@example.com", "Marta", ["eventos", "marketing"], foto=FOTO)
        self.alta("vp@example.com", "Vera", ["ingenieria", "eventos"], vp_de=["ingenieria"], foto=FOTO)
        self.alta("board@example.com", "Mariano", ["marketing", "eventos"], cargo="boardmember", foto=FOTO)
        self.alta("pres@example.com", "Pablo", ["eventos", "marketing"], cargo="presidente", foto=FOTO)
        miembros = self.miembros()
        self.assertEqual([m["nombre"] for m in miembros], ["Pablo", "Mariano", "Vera", "Marta"])
        # Bajo el nombre: el puesto de presidencia, board y VPs; nada para el resto.
        self.assertEqual(
            [m["puesto"] and m["puesto"]["es"] for m in miembros],
            ["Presidente", "Board member", "VP de Ingeniería", None],
        )

    def test_la_foto_es_la_misma_que_en_equipo(self):
        acceso = self.alta("ana@example.com", "Ana", ["marketing", "eventos"])
        self.assertEqual(self.miembros(), [])

        # Subirla en Cuentas (o desde la ficha del miembro) la saca en la web.
        equipo_service.actualizar_perfil("ana@example.com", foto=FOTO)
        url = self.miembros()[0]["foto"]
        self.assertTrue(url.startswith(f"/api/equipo/foto/{acceso['id']}?v="))
        # La foto va aparte, sin sesión (ya es pública) y se guarda en caché.
        foto = self.client.get(url)
        self.assertEqual(foto.status_code, 200)
        self.assertEqual(foto.mimetype, "image/png")
        self.assertEqual(foto.data, base64.b64decode(FOTO.split(",")[1]))
        self.assertIn("max-age", foto.headers["Cache-Control"])
        equipo_service.actualizar_equipo_acceso(acceso["id"], foto="")
        self.assertEqual(self.miembros(), [])

    def test_la_foto_de_quien_no_sale_en_la_web_pide_sesion(self):
        acceso = self.alta("ana@example.com", "Ana", ["marketing", "eventos"], en_web=False, foto=FOTO)
        url = equipo_service.url_foto(acceso["id"], FOTO)
        self.assertEqual(self.client.get(url).status_code, 404)
        with self.client.session_transaction() as sesion:
            sesion["equipo_email"] = "ana@example.com"
        respuesta = self.client.get(url)
        self.assertEqual(respuesta.status_code, 200)
        self.assertTrue(respuesta.headers["Cache-Control"].startswith("private"))

    def test_linkedin_solo_https(self):
        acceso = self.alta("ana@example.com", "Ana", ["marketing", "eventos"], foto=FOTO)
        with self.client.session_transaction() as sesion:
            sesion["admin_auth"] = True
        url = f"/api/admin/equipo/{acceso['id']}"
        perfil = "https://www.linkedin.com/in/ana-garc%C3%ADa/?a=1&b=2"
        self.assertEqual(self.client.put(url, json={"linkedin": "javascript:alert(1)"}).status_code, 400)
        self.assertEqual(self.client.put(url, json={"linkedin": perfil}).status_code, 200)
        self.assertEqual(self.miembros()[0]["linkedin"], perfil)


if __name__ == "__main__":
    unittest.main()
