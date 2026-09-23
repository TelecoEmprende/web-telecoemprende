"""Ficha de datos personales (/equipo/datosformulario) y su Excel en /admin."""

import os
import unittest
from io import BytesIO

os.environ["ADMIN_PASSWORD"] = "test-admin"
os.environ["DATABASE_URL"] = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql://telecoemprende:telecoemprende@localhost:5432/telecoemprende_test",
)

from openpyxl import load_workbook  # noqa: E402

import app  # noqa: E402
import backend.services.equipo as equipo_service  # noqa: E402
import backend.services.security as security_service  # noqa: E402

# PNG de 1x1 válido.
FOTO = (
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4"
    "nGNgYGD4DwABBAEAwS2OUAAAAABJRU5ErkJggg=="
)


class DatosFormularioTestCase(unittest.TestCase):
    def setUp(self):
        security_service.request_log.clear()
        equipo_service.init_equipo_db()

        conn = equipo_service._get_connection()
        with conn.cursor() as cur:
            cur.execute("DELETE FROM equipo_accesos")
        conn.commit()
        conn.close()

        equipo_service.crear_equipo_acceso(
            "ana@alumnos.upm.es", "contrasena-larga", ["marketing"], vp_de=["marketing"]
        )
        app.app.config["TESTING"] = True
        self.client = app.app.test_client()

    def entrar(self):
        self.client.post(
            "/api/equipo/login",
            json={"email": "ana@alumnos.upm.es", "password": "contrasena-larga"},
        )

    def guardar(self, **cambios):
        datos = {
            "nombre": "Ana", "apellidos": "García López", "dni": "12345678-z",
            "correo": "ana@gmail.com", "foto": FOTO, **cambios,
        }
        return self.client.put("/api/equipo/datos-formulario", json=datos)

    def test_sin_sesion_no_deja_leer_ni_guardar(self):
        self.assertEqual(self.client.get("/api/equipo/datos-formulario").status_code, 401)
        self.assertEqual(self.guardar().status_code, 401)

    def test_guarda_y_devuelve_los_datos_propios(self):
        self.entrar()
        self.assertEqual(self.guardar().status_code, 200)

        datos = self.client.get("/api/equipo/datos-formulario").get_json()
        self.assertEqual(datos["apellidos"], "García López")
        self.assertEqual(datos["dni"], "12345678Z")
        self.assertEqual(datos["foto"], FOTO)

        # Sin `foto` se conserva la guardada.
        self.client.put("/api/equipo/datos-formulario", json={
            "nombre": "Ana", "apellidos": "García", "dni": "X1234567L", "correo": "ana@upm.es",
        })
        self.assertEqual(self.client.get("/api/equipo/datos-formulario").get_json()["foto"], FOTO)

    def test_rechaza_datos_invalidos(self):
        self.entrar()
        self.assertEqual(self.guardar(apellidos="").status_code, 400)
        self.assertEqual(self.guardar(dni="12<3>").status_code, 400)
        self.assertEqual(self.guardar(correo="no-es-correo").status_code, 400)
        self.assertEqual(self.guardar(foto="data:text/html;base64,PHNjcmlwdD4=").status_code, 400)

    def test_excel_solo_para_admin_con_roles_y_foto(self):
        self.assertEqual(self.client.get("/api/admin/equipo/excel").status_code, 401)

        self.entrar()
        self.guardar(nombre="=HYPERLINK()")
        self.client.post("/api/admin/login", json={"password": "test-admin"})
        respuesta = self.client.get("/api/admin/equipo/excel")
        self.assertEqual(respuesta.status_code, 200)

        ws = load_workbook(BytesIO(respuesta.data)).active
        fila = [c.value for c in ws[2]]
        self.assertEqual(fila[0], "'=HYPERLINK()")
        self.assertEqual(fila[1:6], ["García López", "12345678Z", "ana@gmail.com",
                                     "ana@alumnos.upm.es", "marketing"])
        self.assertEqual(fila[6], "marketing")
        self.assertEqual(len(ws._images), 1)


if __name__ == "__main__":
    unittest.main()
