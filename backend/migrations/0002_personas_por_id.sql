-- Las personas se referencian por el id de su cuenta (`equipo_accesos.id`),
-- con clave foránea, en vez de por su email copiado como texto en cada tabla.
-- Así cambiar el email de alguien no deja sus tareas apuntando al viejo, y
-- borrar una cuenta se lleva sus asignaciones en vez de dejarlas huérfanas.
--
-- Solo añade y copia: las columnas de email antiguas (`responsables`,
-- `creado_por`, `asistentes`, `confirmados`, `asistio`, `autor`,
-- `editado_por`) se quedan como estaban hasta que se borren a propósito en
-- otra migración. El código ya no las lee ni las escribe.

-- Muchos a muchos: quién está en qué -----------------------------------------
-- `orden` conserva el orden en que se eligieron (el primero es el principal).
-- ON DELETE CASCADE por los dos lados: sin la tarea o sin la persona, la
-- asignación no significa nada.
CREATE TABLE tarea_responsables (
    tarea_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    persona_id INTEGER NOT NULL REFERENCES equipo_accesos(id) ON DELETE CASCADE,
    orden SMALLINT NOT NULL DEFAULT 0,
    PRIMARY KEY (tarea_id, persona_id)
);
CREATE TABLE entregable_responsables (
    entregable_id INTEGER NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
    persona_id INTEGER NOT NULL REFERENCES equipo_accesos(id) ON DELETE CASCADE,
    orden SMALLINT NOT NULL DEFAULT 0,
    PRIMARY KEY (entregable_id, persona_id)
);
CREATE TABLE reunion_asistentes (
    reunion_id INTEGER NOT NULL REFERENCES reuniones(id) ON DELETE CASCADE,
    persona_id INTEGER NOT NULL REFERENCES equipo_accesos(id) ON DELETE CASCADE,
    orden SMALLINT NOT NULL DEFAULT 0,
    PRIMARY KEY (reunion_id, persona_id)
);
CREATE TABLE servicio_responsables (
    servicio_id INTEGER NOT NULL REFERENCES servicios(id) ON DELETE CASCADE,
    persona_id INTEGER NOT NULL REFERENCES equipo_accesos(id) ON DELETE CASCADE,
    orden SMALLINT NOT NULL DEFAULT 0,
    PRIMARY KEY (servicio_id, persona_id)
);
-- Dos hechos distintos de un evento del club: dijo que venía, y vino.
CREATE TABLE evento_confirmados (
    evento_id INTEGER NOT NULL REFERENCES calendario_eventos(id) ON DELETE CASCADE,
    persona_id INTEGER NOT NULL REFERENCES equipo_accesos(id) ON DELETE CASCADE,
    orden SMALLINT NOT NULL DEFAULT 0,
    PRIMARY KEY (evento_id, persona_id)
);
CREATE TABLE evento_asistentes (
    evento_id INTEGER NOT NULL REFERENCES calendario_eventos(id) ON DELETE CASCADE,
    persona_id INTEGER NOT NULL REFERENCES equipo_accesos(id) ON DELETE CASCADE,
    orden SMALLINT NOT NULL DEFAULT 0,
    PRIMARY KEY (evento_id, persona_id)
);
CREATE INDEX tarea_responsables_persona_idx ON tarea_responsables (persona_id);
CREATE INDEX entregable_responsables_persona_idx ON entregable_responsables (persona_id);
CREATE INDEX reunion_asistentes_persona_idx ON reunion_asistentes (persona_id);
CREATE INDEX servicio_responsables_persona_idx ON servicio_responsables (persona_id);
CREATE INDEX evento_confirmados_persona_idx ON evento_confirmados (persona_id);
CREATE INDEX evento_asistentes_persona_idx ON evento_asistentes (persona_id);

-- Copia desde las listas de emails. Un email sin cuenta no tiene a quién
-- apuntar y se queda solo en la columna antigua (en producción no había
-- ninguno al escribir esto).
INSERT INTO tarea_responsables (tarea_id, persona_id, orden)
SELECT t.id, p.id, MIN(e.n)
FROM tasks t, unnest(t.responsables) WITH ORDINALITY AS e(email, n)
JOIN equipo_accesos p ON lower(p.email) = lower(e.email)
GROUP BY t.id, p.id;
INSERT INTO entregable_responsables (entregable_id, persona_id, orden)
SELECT c.id, p.id, MIN(e.n)
FROM contents c, unnest(c.responsables) WITH ORDINALITY AS e(email, n)
JOIN equipo_accesos p ON lower(p.email) = lower(e.email)
GROUP BY c.id, p.id;
INSERT INTO reunion_asistentes (reunion_id, persona_id, orden)
SELECT r.id, p.id, MIN(e.n)
FROM reuniones r, unnest(r.asistentes) WITH ORDINALITY AS e(email, n)
JOIN equipo_accesos p ON lower(p.email) = lower(e.email)
GROUP BY r.id, p.id;
INSERT INTO servicio_responsables (servicio_id, persona_id, orden)
SELECT s.id, p.id, MIN(e.n)
FROM servicios s, unnest(s.responsables) WITH ORDINALITY AS e(email, n)
JOIN equipo_accesos p ON lower(p.email) = lower(e.email)
GROUP BY s.id, p.id;
INSERT INTO evento_confirmados (evento_id, persona_id, orden)
SELECT ev.id, p.id, MIN(e.n)
FROM calendario_eventos ev, unnest(ev.confirmados) WITH ORDINALITY AS e(email, n)
JOIN equipo_accesos p ON lower(p.email) = lower(e.email)
GROUP BY ev.id, p.id;
INSERT INTO evento_asistentes (evento_id, persona_id, orden)
SELECT ev.id, p.id, MIN(e.n)
FROM calendario_eventos ev, unnest(ev.asistio) WITH ORDINALITY AS e(email, n)
JOIN equipo_accesos p ON lower(p.email) = lower(e.email)
GROUP BY ev.id, p.id;

-- Autoría: quién creó o editó algo ------------------------------------------
-- ON DELETE SET NULL: borrar la cuenta de alguien no borra lo que hizo.
ALTER TABLE campaigns ADD COLUMN creado_por_id INTEGER REFERENCES equipo_accesos(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN creado_por_id INTEGER REFERENCES equipo_accesos(id) ON DELETE SET NULL;
ALTER TABLE task_comments ADD COLUMN autor_id INTEGER REFERENCES equipo_accesos(id) ON DELETE SET NULL;
ALTER TABLE presupuesto_lineas ADD COLUMN creado_por_id INTEGER REFERENCES equipo_accesos(id) ON DELETE SET NULL;
ALTER TABLE reuniones ADD COLUMN creado_por_id INTEGER REFERENCES equipo_accesos(id) ON DELETE SET NULL;
ALTER TABLE servicios ADD COLUMN creado_por_id INTEGER REFERENCES equipo_accesos(id) ON DELETE SET NULL;
ALTER TABLE notas ADD COLUMN creado_por_id INTEGER REFERENCES equipo_accesos(id) ON DELETE SET NULL;
ALTER TABLE notas ADD COLUMN editado_por_id INTEGER REFERENCES equipo_accesos(id) ON DELETE SET NULL;

UPDATE campaigns x SET creado_por_id = p.id FROM equipo_accesos p WHERE lower(p.email) = lower(x.creado_por);
UPDATE tasks x SET creado_por_id = p.id FROM equipo_accesos p WHERE lower(p.email) = lower(x.creado_por);
UPDATE task_comments x SET autor_id = p.id FROM equipo_accesos p WHERE lower(p.email) = lower(x.autor);
UPDATE presupuesto_lineas x SET creado_por_id = p.id FROM equipo_accesos p WHERE lower(p.email) = lower(x.creado_por);
UPDATE reuniones x SET creado_por_id = p.id FROM equipo_accesos p WHERE lower(p.email) = lower(x.creado_por);
UPDATE servicios x SET creado_por_id = p.id FROM equipo_accesos p WHERE lower(p.email) = lower(x.creado_por);
UPDATE notas x SET creado_por_id = p.id FROM equipo_accesos p WHERE lower(p.email) = lower(x.creado_por);
UPDATE notas x SET editado_por_id = p.id FROM equipo_accesos p WHERE lower(p.email) = lower(x.editado_por);

-- La nota enlazada a un proyecto apunta de verdad a él: si el proyecto se
-- borra, la nota se queda (sin enlace) en vez de apuntar a un id que ya no es.
UPDATE notas SET proyecto_id = NULL
WHERE proyecto_id IS NOT NULL AND proyecto_id NOT IN (SELECT id FROM campaigns);
ALTER TABLE notas ADD CONSTRAINT notas_proyecto_fk
    FOREIGN KEY (proyecto_id) REFERENCES campaigns(id) ON DELETE SET NULL;

-- Vistas de lectura ---------------------------------------------------------
-- Cada tabla con personas se lee a través de su vista `<tabla>_v`, que trae
-- las personas ya como emails (lo que habla la API) a partir de los ids. Las
-- escrituras van a la tabla y a sus tablas de personas (ver services/db.py).
-- security_invoker: la vista respeta el RLS de las tablas, así que tampoco
-- se puede leer por la API REST de Supabase.
CREATE VIEW tasks_v WITH (security_invoker = true) AS
SELECT t.id, t.departamento, t.campaign_id, t.content_id, t.titulo, t.descripcion,
       t.instrucciones, t.estado, t.prioridad, t.deadline, t.hora, t.tags, t.checklist,
       t.enlaces, t.completado_en, t.created_at, t.updated_at, t.creado_por_id,
       ARRAY(SELECT p.email FROM tarea_responsables r JOIN equipo_accesos p ON p.id = r.persona_id
             WHERE r.tarea_id = t.id ORDER BY r.orden, p.email) AS responsables,
       COALESCE((SELECT p.email FROM equipo_accesos p WHERE p.id = t.creado_por_id), '') AS creado_por
FROM tasks t;

CREATE VIEW contents_v WITH (security_invoker = true) AS
SELECT c.id, c.campaign_id, c.titulo, c.tipo, c.plataforma, c.fecha_publicacion, c.estado,
       c.script, c.copy_texto, c.cta, c.hashtags, c.idea_visual, c.enlaces,
       c.created_at, c.updated_at,
       ARRAY(SELECT p.email FROM entregable_responsables r JOIN equipo_accesos p ON p.id = r.persona_id
             WHERE r.entregable_id = c.id ORDER BY r.orden, p.email) AS responsables
FROM contents c;

CREATE VIEW campaigns_v WITH (security_invoker = true) AS
SELECT c.id, c.nombre, c.objetivo, c.audiencia, c.fecha, c.departamento, c.archivado,
       c.created_at, c.updated_at, c.creado_por_id,
       COALESCE((SELECT p.email FROM equipo_accesos p WHERE p.id = c.creado_por_id), '') AS creado_por
FROM campaigns c;

CREATE VIEW task_comments_v WITH (security_invoker = true) AS
SELECT c.id, c.task_id, c.texto, c.created_at, c.autor_id,
       COALESCE((SELECT p.email FROM equipo_accesos p WHERE p.id = c.autor_id), '') AS autor
FROM task_comments c;

CREATE VIEW reuniones_v WITH (security_invoker = true) AS
SELECT r.id, r.departamento, r.titulo, r.fecha, r.hora, r.objetivo, r.acta,
       r.created_at, r.updated_at, r.creado_por_id,
       ARRAY(SELECT p.email FROM reunion_asistentes a JOIN equipo_accesos p ON p.id = a.persona_id
             WHERE a.reunion_id = r.id ORDER BY a.orden, p.email) AS asistentes,
       COALESCE((SELECT p.email FROM equipo_accesos p WHERE p.id = r.creado_por_id), '') AS creado_por
FROM reuniones r;

CREATE VIEW servicios_v WITH (security_invoker = true) AS
SELECT s.id, s.departamento, s.nombre, s.tipo, s.url, s.renovacion, s.estado, s.notas,
       s.visible_club, s.created_at, s.updated_at, s.creado_por_id,
       ARRAY(SELECT p.email FROM servicio_responsables r JOIN equipo_accesos p ON p.id = r.persona_id
             WHERE r.servicio_id = s.id ORDER BY r.orden, p.email) AS responsables,
       COALESCE((SELECT p.email FROM equipo_accesos p WHERE p.id = s.creado_por_id), '') AS creado_por
FROM servicios s;

CREATE VIEW presupuesto_lineas_v WITH (security_invoker = true) AS
SELECT l.id, l.departamento, l.concepto, l.tipo, l.importe, l.estado, l.fecha, l.notas,
       l.created_at, l.updated_at, l.creado_por_id,
       COALESCE((SELECT p.email FROM equipo_accesos p WHERE p.id = l.creado_por_id), '') AS creado_por
FROM presupuesto_lineas l;

CREATE VIEW calendario_eventos_v WITH (security_invoker = true) AS
SELECT e.id, e.titulo, e.descripcion, e.fecha, e.hora, e.created_at,
       ARRAY(SELECT p.email FROM evento_confirmados c JOIN equipo_accesos p ON p.id = c.persona_id
             WHERE c.evento_id = e.id ORDER BY c.orden, p.email) AS confirmados,
       ARRAY(SELECT p.email FROM evento_asistentes a JOIN equipo_accesos p ON p.id = a.persona_id
             WHERE a.evento_id = e.id ORDER BY a.orden, p.email) AS asistio
FROM calendario_eventos e;

CREATE VIEW notas_v WITH (security_invoker = true) AS
SELECT n.id, n.titulo, n.contenido, n.departamento, n.privada, n.fijada, n.proyecto_id,
       n.created_at, n.updated_at, n.creado_por_id, n.editado_por_id,
       COALESCE((SELECT p.email FROM equipo_accesos p WHERE p.id = n.creado_por_id), '') AS creado_por,
       COALESCE((SELECT p.email FROM equipo_accesos p WHERE p.id = n.editado_por_id), '') AS editado_por
FROM notas n;
