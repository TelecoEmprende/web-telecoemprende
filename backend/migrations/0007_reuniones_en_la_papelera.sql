-- Las reuniones (con su acta) también van a la papelera al borrarlas: un acta
-- es de lo que más cuesta volver a escribir.
ALTER TABLE reuniones ADD COLUMN deleted_at TIMESTAMP,
    ADD COLUMN deleted_by_id INTEGER REFERENCES equipo_accesos(id) ON DELETE SET NULL;
CREATE INDEX reuniones_papelera_idx ON reuniones (deleted_at) WHERE deleted_at IS NOT NULL;

ALTER TABLE historial DROP CONSTRAINT historial_entidad_check;
ALTER TABLE historial ADD CONSTRAINT historial_entidad_check
    CHECK (entidad IN ('proyecto', 'entregable', 'tarea', 'nota', 'reunion'));

DROP VIEW reuniones_v;
CREATE VIEW reuniones_v WITH (security_invoker = true) AS
SELECT r.id, r.departamento, r.titulo, r.fecha, r.hora, r.objetivo, r.contenido,
       r.created_at, r.updated_at, r.creado_por_id,
       ARRAY(SELECT p.email FROM reunion_asistentes a JOIN equipo_accesos p ON p.id = a.persona_id
             WHERE a.reunion_id = r.id ORDER BY a.orden, p.email) AS asistentes,
       COALESCE((SELECT p.email FROM equipo_accesos p WHERE p.id = r.creado_por_id), '') AS creado_por
FROM reuniones r WHERE r.deleted_at IS NULL;
