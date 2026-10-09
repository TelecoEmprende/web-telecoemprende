-- Las columnas de email que sustituyó 0002_personas_por_id. En producción
-- las borró a mano el equipo desde el editor SQL de Supabase (octubre de
-- 2026) tras comprobar que 0002 lo había copiado todo; aquí quedan para que
-- cualquier otra base (local, tests) acabe igual. IF EXISTS: donde ya no
-- están, no hace nada.
ALTER TABLE tasks DROP COLUMN IF EXISTS responsables, DROP COLUMN IF EXISTS creado_por;
ALTER TABLE contents DROP COLUMN IF EXISTS responsables;
ALTER TABLE campaigns DROP COLUMN IF EXISTS creado_por;
ALTER TABLE task_comments DROP COLUMN IF EXISTS autor;
ALTER TABLE reuniones DROP COLUMN IF EXISTS asistentes, DROP COLUMN IF EXISTS creado_por;
ALTER TABLE servicios DROP COLUMN IF EXISTS responsables, DROP COLUMN IF EXISTS creado_por;
ALTER TABLE presupuesto_lineas DROP COLUMN IF EXISTS creado_por;
ALTER TABLE notas DROP COLUMN IF EXISTS creado_por, DROP COLUMN IF EXISTS editado_por;
ALTER TABLE calendario_eventos DROP COLUMN IF EXISTS confirmados, DROP COLUMN IF EXISTS asistio;
