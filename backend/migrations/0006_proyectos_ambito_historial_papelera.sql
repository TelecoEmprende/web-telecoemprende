-- Proyectos del club: ámbito, estado y responsable; papelera (borrado que se
-- puede deshacer); historial de cambios; acta de reunión en bloques.

-- Ámbito de un proyecto -------------------------------------------------------
-- Antes un proyecto era de un solo departamento (`campaigns.departamento`).
-- Ahora es de uno, de varios o de los tres (= todo el club): `departamentos`.
-- La columna antigua se deja de leer y se borrará en una migración posterior.
ALTER TABLE campaigns ADD COLUMN departamentos TEXT[] NOT NULL DEFAULT '{}';
UPDATE campaigns SET departamentos = ARRAY[departamento];
ALTER TABLE campaigns ADD COLUMN estado VARCHAR(10) NOT NULL DEFAULT 'activo'
    CHECK (estado IN ('idea', 'activo', 'pausado', 'cerrado'));
ALTER TABLE campaigns ADD COLUMN responsable_id INTEGER
    REFERENCES equipo_accesos(id) ON DELETE SET NULL;

-- Papelera --------------------------------------------------------------------
-- Borrar marca la fila (`deleted_at`) en vez de quitarla: las vistas `_v` ya
-- no la enseñan, y se puede restaurar. Al borrar un proyecto se marcan con la
-- misma hora sus entregables y tareas, para restaurarlos juntos. Se vacía a
-- los 30 días (cron diario) o a mano por un admin.
ALTER TABLE campaigns ADD COLUMN deleted_at TIMESTAMP,
    ADD COLUMN deleted_by_id INTEGER REFERENCES equipo_accesos(id) ON DELETE SET NULL;
ALTER TABLE contents ADD COLUMN deleted_at TIMESTAMP,
    ADD COLUMN deleted_by_id INTEGER REFERENCES equipo_accesos(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN deleted_at TIMESTAMP,
    ADD COLUMN deleted_by_id INTEGER REFERENCES equipo_accesos(id) ON DELETE SET NULL;
ALTER TABLE notas ADD COLUMN deleted_at TIMESTAMP,
    ADD COLUMN deleted_by_id INTEGER REFERENCES equipo_accesos(id) ON DELETE SET NULL;
CREATE INDEX campaigns_papelera_idx ON campaigns (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX contents_papelera_idx ON contents (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX tasks_papelera_idx ON tasks (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX notas_papelera_idx ON notas (deleted_at) WHERE deleted_at IS NOT NULL;

-- Historial -------------------------------------------------------------------
-- Quién hizo qué sobre proyectos, entregables, tareas y notas: crear, editar
-- (con campo, valor anterior y valor nuevo), borrar y restaurar. Sin clave
-- foránea a la fila: el historial sobrevive a que se vacíe la papelera.
-- `proyecto_id` agrupa lo que cuelga de un proyecto para su pestaña Historial.
CREATE TABLE historial (
    id BIGSERIAL PRIMARY KEY,
    entidad VARCHAR(12) NOT NULL CHECK (entidad IN ('proyecto', 'entregable', 'tarea', 'nota')),
    entidad_id INTEGER NOT NULL,
    proyecto_id INTEGER,
    accion VARCHAR(12) NOT NULL CHECK (accion IN ('crear', 'editar', 'borrar', 'restaurar')),
    titulo VARCHAR(200) NOT NULL DEFAULT '',
    cambios JSONB NOT NULL DEFAULT '[]',
    persona_id INTEGER REFERENCES equipo_accesos(id) ON DELETE SET NULL,
    creado_en TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX historial_entidad_idx ON historial (entidad, entidad_id, creado_en DESC);
CREATE INDEX historial_proyecto_idx ON historial (proyecto_id, creado_en DESC);
CREATE INDEX historial_reciente_idx ON historial (creado_en DESC);

-- Acta de reunión -------------------------------------------------------------
-- El acta pasa de texto plano a bloques (el mismo editor que las Notas). El
-- texto que ya hubiera se convierte, línea a línea, en párrafos; la columna
-- `acta` se deja de leer y se borrará en una migración posterior.
ALTER TABLE reuniones ADD COLUMN contenido JSONB NOT NULL DEFAULT '[]';
UPDATE reuniones SET contenido = (
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'type', 'paragraph',
            'content', CASE WHEN t.linea = '' THEN '[]'::jsonb
                       ELSE jsonb_build_array(jsonb_build_object('type', 'text', 'text', t.linea, 'styles', '{}'::jsonb))
                       END
        ) ORDER BY t.n
    ), '[]'::jsonb)
    FROM regexp_split_to_table(reuniones.acta, E'\n') WITH ORDINALITY AS t(linea, n)
)
WHERE acta <> '';

-- Vistas ----------------------------------------------------------------------
-- Las mismas de 0002, sin lo borrado; campaigns_v con ámbito, estado y
-- responsable; reuniones_v con el acta en bloques.
DROP VIEW tasks_v;
DROP VIEW contents_v;
DROP VIEW campaigns_v;
DROP VIEW notas_v;
DROP VIEW reuniones_v;

CREATE VIEW tasks_v WITH (security_invoker = true) AS
SELECT t.id, t.departamento, t.campaign_id, t.content_id, t.titulo, t.descripcion,
       t.instrucciones, t.estado, t.prioridad, t.deadline, t.hora, t.tags, t.checklist,
       t.enlaces, t.completado_en, t.created_at, t.updated_at, t.creado_por_id,
       ARRAY(SELECT p.email FROM tarea_responsables r JOIN equipo_accesos p ON p.id = r.persona_id
             WHERE r.tarea_id = t.id ORDER BY r.orden, p.email) AS responsables,
       COALESCE((SELECT p.email FROM equipo_accesos p WHERE p.id = t.creado_por_id), '') AS creado_por
FROM tasks t WHERE t.deleted_at IS NULL;

CREATE VIEW contents_v WITH (security_invoker = true) AS
SELECT c.id, c.campaign_id, c.titulo, c.tipo, c.plataforma, c.fecha_publicacion, c.estado,
       c.script, c.copy_texto, c.cta, c.hashtags, c.idea_visual, c.enlaces,
       c.created_at, c.updated_at,
       ARRAY(SELECT p.email FROM entregable_responsables r JOIN equipo_accesos p ON p.id = r.persona_id
             WHERE r.entregable_id = c.id ORDER BY r.orden, p.email) AS responsables
FROM contents c WHERE c.deleted_at IS NULL;

CREATE VIEW campaigns_v WITH (security_invoker = true) AS
SELECT c.id, c.nombre, c.objetivo, c.audiencia, c.fecha, c.archivado, c.estado,
       c.departamentos,
       -- El departamento «principal» (el primero del ámbito): con él se abre el
       -- proyecto desde su ruta, y las pantallas que solo saben de uno lo usan.
       c.departamentos[1] AS departamento,
       c.created_at, c.updated_at, c.creado_por_id, c.responsable_id,
       COALESCE((SELECT p.email FROM equipo_accesos p WHERE p.id = c.creado_por_id), '') AS creado_por,
       COALESCE((SELECT p.email FROM equipo_accesos p WHERE p.id = c.responsable_id), '') AS responsable
FROM campaigns c WHERE c.deleted_at IS NULL;

CREATE VIEW notas_v WITH (security_invoker = true) AS
SELECT n.id, n.titulo, n.contenido, n.departamento, n.privada, n.fijada, n.proyecto_id,
       n.created_at, n.updated_at, n.creado_por_id, n.editado_por_id,
       COALESCE((SELECT p.email FROM equipo_accesos p WHERE p.id = n.creado_por_id), '') AS creado_por,
       COALESCE((SELECT p.email FROM equipo_accesos p WHERE p.id = n.editado_por_id), '') AS editado_por
FROM notas n WHERE n.deleted_at IS NULL;

CREATE VIEW reuniones_v WITH (security_invoker = true) AS
SELECT r.id, r.departamento, r.titulo, r.fecha, r.hora, r.objetivo, r.contenido,
       r.created_at, r.updated_at, r.creado_por_id,
       ARRAY(SELECT p.email FROM reunion_asistentes a JOIN equipo_accesos p ON p.id = a.persona_id
             WHERE a.reunion_id = r.id ORDER BY a.orden, p.email) AS asistentes,
       COALESCE((SELECT p.email FROM equipo_accesos p WHERE p.id = r.creado_por_id), '') AS creado_por
FROM reuniones r;
