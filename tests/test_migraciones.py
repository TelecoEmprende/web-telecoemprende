"""Migraciones y relaciones entre tablas por id de cuenta (backend/migrations).

Dos cosas: que la migración 0002 copia bien los datos con el formato antiguo
(emails como texto, que es lo que tiene producción) y que, ya con ids, cambiar
o borrar una cuenta se refleja en todas partes sin dejar nada huérfano.
"""

import os
import unittest
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

os.environ["DATABASE_URL"] = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql://telecoemprende:telecoemprende@localhost:5432/telecoemprende_test",
)

import psycopg2  # noqa: E402
from werkzeug.security import generate_password_hash  # noqa: E402

import app  # noqa: E402
import backend.services.equipo as equipo_service  # noqa: E402
from backend.services import db  # noqa: E402

MIGRACIONES = Path(db.MIGRACIONES)


class MigracionPersonasTestCase(unittest.TestCase):
    """La 0002 sobre una base con datos del formato antiguo, en una base de
    datos aparte para no tocar la de los demás tests."""

    def setUp(self):
        partes = urlsplit(os.environ["DATABASE_URL"])
        self.nombre = partes.path.lstrip("/") + "_migraciones"
        self.admin_url = urlunsplit(partes._replace(path="/postgres"))
        self.url = urlunsplit(partes._replace(path="/" + self.nombre))
        try:
            admin = psycopg2.connect(self.admin_url)
        except psycopg2.Error:
            self.skipTest("no se puede crear una base de datos aparte")
        admin.autocommit = True
        with admin.cursor() as cur:
            cur.execute(f'DROP DATABASE IF EXISTS "{self.nombre}"')
            cur.execute(f'CREATE DATABASE "{self.nombre}"')
        admin.close()

    def tearDown(self):
        admin = psycopg2.connect(self.admin_url)
        admin.autocommit = True
        with admin.cursor() as cur:
            cur.execute(f'DROP DATABASE IF EXISTS "{self.nombre}"')
        admin.close()

    def aplicar(self, cur, version):
        cur.execute((MIGRACIONES / f"{version}.sql").read_text(encoding="utf-8"))

    def test_copia_personas_y_autoria_del_formato_antiguo(self):
        with psycopg2.connect(self.url) as conn:
            with conn.cursor() as cur:
                self.aplicar(cur, "0001_esquema_base")
                cur.execute(
                    "INSERT INTO equipo_accesos (email, password_hash, equipos)"
                    " VALUES ('ana@x.es', 'h', '{marketing}'), ('bea@x.es', 'h', '{marketing}')"
                    " RETURNING id"
                )
                ana, bea = (f[0] for f in cur.fetchall())
                cur.execute(
                    "INSERT INTO campaigns (nombre, creado_por) VALUES ('Feria', 'ana@x.es') RETURNING id"
                )
                proyecto = cur.fetchone()[0]
                # Mayúsculas, un email sin cuenta y el orden elegido (Bea primero).
                cur.execute(
                    "INSERT INTO tasks (titulo, responsables, creado_por)"
                    " VALUES ('Cartel', '{BEA@x.es,ana@x.es,nadie@x.es}', 'Ana@x.es') RETURNING id"
                )
                tarea = cur.fetchone()[0]
                cur.execute(
                    "INSERT INTO calendario_eventos (titulo, fecha, confirmados, asistio)"
                    " VALUES ('Demo', '2026-10-24', '{ana@x.es,bea@x.es}', '{bea@x.es}') RETURNING id"
                )
                evento = cur.fetchone()[0]
                cur.execute(
                    "INSERT INTO notas (titulo, creado_por, editado_por, proyecto_id)"
                    " VALUES ('Huérfana', 'bea@x.es', 'ana@x.es', 999), ('Feria', 'ana@x.es', '', %s)",
                    (proyecto,),
                )

                self.aplicar(cur, "0002_personas_por_id")

                cur.execute("SELECT responsables, creado_por FROM tasks_v WHERE id = %s", (tarea,))
                self.assertEqual(cur.fetchone(), (["bea@x.es", "ana@x.es"], "ana@x.es"))
                cur.execute("SELECT creado_por_id FROM campaigns WHERE id = %s", (proyecto,))
                self.assertEqual(cur.fetchone()[0], ana)
                cur.execute("SELECT confirmados, asistio FROM calendario_eventos_v WHERE id = %s", (evento,))
                self.assertEqual(cur.fetchone(), (["ana@x.es", "bea@x.es"], ["bea@x.es"]))
                cur.execute(
                    "SELECT titulo, creado_por_id, editado_por_id, proyecto_id FROM notas ORDER BY id"
                )
                # El proyecto 999 no existía: la nota se queda, sin enlace.
                self.assertEqual(
                    cur.fetchall(), [("Huérfana", bea, ana, None), ("Feria", ana, None, proyecto)]
                )


    def test_los_datos_de_produccion_sobreviven_a_las_migraciones_0005_a_0009(self):
        """Lo que ya hay (proyectos de un departamento, cuentas con dos
        departamentos, reuniones con el acta en texto, tareas con responsables)
        llega entero al esquema nuevo."""
        with psycopg2.connect(self.url) as conn:
            with conn.cursor() as cur:
                for version in (
                    "0001_esquema_base", "0002_personas_por_id", "0003_fuera_emails_de_personas",
                    "0004_linkedin_equipo",
                ):
                    self.aplicar(cur, version)
                cur.execute(
                    "INSERT INTO equipo_accesos (email, password_hash, equipos, correo_personal)"
                    " VALUES ('ana@x.es', 'h', '{eventos,marketing}', 'ana@gmail.com'),"
                    "        ('bea@x.es', 'h', '{ingenieria}', ''),"
                    "        ('nueva@x.es', 'h', '{}', '')"
                )
                cur.execute(
                    "INSERT INTO campaigns (nombre, departamento) VALUES ('Feria', 'eventos') RETURNING id"
                )
                proyecto = cur.fetchone()[0]
                cur.execute(
                    "INSERT INTO tasks (titulo, departamento, campaign_id) VALUES ('Cartel', 'eventos', %s)"
                    " RETURNING id",
                    (proyecto,),
                )
                tarea = cur.fetchone()[0]
                cur.execute(
                    "INSERT INTO reuniones (departamento, titulo, acta)"
                    " VALUES ('eventos', 'Semanal', E'Se acordó la feria\\n\\nPendiente: carteles'),"
                    "        ('eventos', 'Sin acta', '')"
                )

                for version in (
                    "0005_todos_en_los_tres_departamentos",
                    "0006_proyectos_ambito_historial_papelera",
                    "0007_reuniones_en_la_papelera",
                    "0008_recuperar_clave",
                    "0009_fuera_columnas_sin_uso",
                ):
                    self.aplicar(cur, version)

                # Todos en los tres departamentos, respetando el orden que había.
                cur.execute("SELECT email, equipos FROM equipo_accesos ORDER BY email")
                self.assertEqual(
                    cur.fetchall(),
                    [
                        ("ana@x.es", ["eventos", "marketing", "ingenieria"]),
                        ("bea@x.es", ["ingenieria", "marketing", "eventos"]),
                        ("nueva@x.es", ["marketing", "eventos", "ingenieria"]),
                    ],
                )
                # El proyecto de un departamento pasa a tener ese ámbito y sigue
                # abriéndose por él; sus tareas siguen colgando de él.
                cur.execute(
                    "SELECT departamentos, departamento, estado, responsable FROM campaigns_v WHERE id = %s",
                    (proyecto,),
                )
                self.assertEqual(cur.fetchone(), (["eventos"], "eventos", "activo", ""))
                cur.execute("SELECT campaign_id FROM tasks_v WHERE id = %s", (tarea,))
                self.assertEqual(cur.fetchone(), (proyecto,))
                # El acta de texto pasa a párrafos, una línea cada uno.
                cur.execute("SELECT titulo, contenido FROM reuniones_v")
                actas = dict(cur.fetchall())
                textos = ["".join(t["text"] for t in b["content"]) for b in actas["Semanal"]]
                self.assertEqual(textos, ["Se acordó la feria", "", "Pendiente: carteles"])
                self.assertEqual(actas["Sin acta"], [])
                # Y las columnas sin uso ya no están.
                cur.execute(
                    "SELECT table_name, column_name FROM information_schema.columns"
                    " WHERE (table_name, column_name) IN"
                    " (('equipo_accesos', 'correo_personal'), ('campaigns', 'departamento'),"
                    "  ('reuniones', 'acta'))"
                )
                self.assertEqual(cur.fetchall(), [])


    def test_la_0010_solo_renombra_y_la_api_lee_lo_mismo(self):
        """Tablas y columnas en inglés: los datos siguen ahí, las vistas `_v`
        mantienen los nombres de la API y las personas siguen enlazadas."""
        with psycopg2.connect(self.url) as conn:
            with conn.cursor() as cur:
                for archivo in sorted(MIGRACIONES.glob("*.sql")):
                    if archivo.stem >= "0010":
                        break
                    self.aplicar(cur, archivo.stem)
                cur.execute(
                    "INSERT INTO equipo_accesos (email, password_hash, equipos, nombre)"
                    " VALUES ('ana@x.es', 'h', '{eventos,marketing,ingenieria}', 'Ana') RETURNING id"
                )
                ana = cur.fetchone()[0]
                cur.execute(
                    "INSERT INTO campaigns (nombre, departamentos, responsable_id)"
                    " VALUES ('Feria', '{eventos}', %s) RETURNING id",
                    (ana,),
                )
                proyecto = cur.fetchone()[0]
                cur.execute(
                    "INSERT INTO tasks (titulo, departamento, campaign_id, estado, hora)"
                    " VALUES ('Cartel', 'eventos', %s, 'en_progreso', '10:00') RETURNING id",
                    (proyecto,),
                )
                tarea = cur.fetchone()[0]
                cur.execute(
                    "INSERT INTO tarea_responsables (tarea_id, persona_id, orden) VALUES (%s, %s, 1)",
                    (tarea, ana),
                )
                cur.execute(
                    "INSERT INTO historial (entidad, entidad_id, accion, titulo, persona_id)"
                    " VALUES ('tarea', %s, 'crear', 'Cartel', %s)",
                    (tarea, ana),
                )

                self.aplicar(cur, "0010_tablas_y_columnas_en_ingles")

                cur.execute(
                    "SELECT titulo, estado, hora, departamento, campaign_id, responsables"
                    " FROM tasks_v WHERE id = %s",
                    (tarea,),
                )
                self.assertEqual(
                    cur.fetchone(), ("Cartel", "en_progreso", "10:00", "eventos", proyecto, ["ana@x.es"])
                )
                cur.execute("SELECT nombre, departamentos, responsable FROM projects_v")
                self.assertEqual(cur.fetchall(), [("Feria", ["eventos"], "ana@x.es")])
                cur.execute("SELECT title, status, due_time, project_id FROM tasks")
                self.assertEqual(cur.fetchall(), [("Cartel", "en_progreso", "10:00", proyecto)])
                cur.execute("SELECT first_name, preferred_departments FROM members")
                self.assertEqual(cur.fetchall(), [("Ana", ["eventos", "marketing", "ingenieria"])])
                cur.execute("SELECT entity_type, entity_id, member_id FROM history")
                self.assertEqual(cur.fetchall(), [("tarea", tarea, ana)])


class RelacionesPorIdTestCase(unittest.TestCase):
    def setUp(self):
        db.migrar()
        conn = equipo_service._get_connection()
        with conn.cursor() as cur:
            cur.execute("DELETE FROM tasks")
            cur.execute("DELETE FROM projects")
            cur.execute("DELETE FROM notes")
            cur.execute("DELETE FROM members")
            for email in ("vp@example.com", "ana@example.com"):
                cur.execute(
                    "INSERT INTO members (email, password_hash, preferred_departments, vp_of, is_admin)"
                    " VALUES (%s, %s, '{marketing,eventos}', '{marketing}', %s)",
                    (email, generate_password_hash("test-equipo"), email == "vp@example.com"),
                )
        conn.commit()
        conn.close()
        app.app.config["TESTING"] = True
        self.client = app.app.test_client()
        self.client.post(
            "/api/equipo/login", json={"email": "vp@example.com", "password": "test-equipo"}
        )

    def tarea(self):
        respuesta = self.client.post(
            "/api/marketing/tasks",
            json={"titulo": "Cartel", "instrucciones": "A3", "responsables": ["ana@example.com"]},
        )
        self.assertEqual(respuesta.status_code, 201, respuesta.get_json())
        return respuesta.get_json()["task"]["id"]

    def responsables(self):
        return [t["responsables"] for t in self.client.get("/api/marketing/tasks").get_json()["tasks"]]

    def id_de(self, email):
        return next(a["id"] for a in equipo_service.listar_equipo_accesos() if a["email"] == email)

    def test_cambiar_el_email_de_alguien_no_le_quita_sus_tareas(self):
        self.tarea()
        cambio = self.client.put(
            f"/api/admin/equipo/{self.id_de('ana@example.com')}", json={"email": "ana.nueva@example.com"}
        )
        self.assertEqual(cambio.status_code, 200, cambio.get_json())
        self.assertEqual(self.responsables(), [["ana.nueva@example.com"]])

    def test_borrar_una_cuenta_la_quita_de_sus_tareas_sin_borrarlas(self):
        self.tarea()
        self.client.delete(f"/api/admin/equipo/{self.id_de('ana@example.com')}")
        self.assertEqual(self.responsables(), [[]])

    def test_un_responsable_sin_cuenta_se_rechaza(self):
        respuesta = self.client.post(
            "/api/marketing/tasks",
            json={"titulo": "X", "instrucciones": "Y", "responsables": ["nadie@example.com"]},
        )
        self.assertEqual(respuesta.status_code, 400)

    def test_la_nota_sigue_con_su_proyecto_en_la_papelera_y_se_desvincula_al_vaciarla(self):
        proyecto = self.client.post("/api/marketing/campaigns", json={"nombre": "Feria"}).get_json()
        proyecto_id = proyecto["campaign"]["id"]
        nota = self.client.post(
            "/api/equipo/notas", json={"titulo": "Contactos", "proyecto_id": proyecto_id}
        ).get_json()["nota"]
        self.client.delete(f"/api/marketing/campaigns/{proyecto_id}")
        # A la papelera, no borrado: restaurar el proyecto devuelve el enlace.
        leida = self.client.get(f"/api/equipo/notas/{nota['id']}").get_json()["nota"]
        self.assertEqual(leida["proyecto_id"], proyecto_id)

        from backend.services import historial

        historial.vaciar_papelera("proyecto", proyecto_id)
        leida = self.client.get(f"/api/equipo/notas/{nota['id']}").get_json()["nota"]
        self.assertIsNone(leida["proyecto_id"])


if __name__ == "__main__":
    unittest.main()
