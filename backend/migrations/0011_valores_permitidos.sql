-- Los valores que ya valida la API (`backend/config.py`,
-- `services/registros.py`), también en la base de datos: un INSERT a mano
-- desde el editor de Supabase o un bug en el backend ya no pueden dejar una
-- tarea en un estado que el tablero no sabe pintar.
--
-- NOT VALID: se exigen a partir de ahora, sin revisar las filas que ya hay
-- (si alguna vieja tuviera un valor raro, la migración no tumbaría el
-- despliegue). `VALIDATE CONSTRAINT` las comprueba enteras cuando se quiera.

ALTER TABLE tasks
    ADD CONSTRAINT tasks_status_check
        CHECK (status IN ('pendiente', 'en_progreso', 'por_revisar', 'acabado')) NOT VALID,
    ADD CONSTRAINT tasks_priority_check
        CHECK (priority IN ('baja', 'media', 'alta')) NOT VALID,
    ADD CONSTRAINT tasks_department_check
        CHECK (department IN ('marketing', 'eventos', 'ingenieria')) NOT VALID;

ALTER TABLE deliverables
    ADD CONSTRAINT deliverables_status_check
        CHECK (status IN ('idea', 'generado', 'en_diseno', 'en_revision', 'programado', 'publicado')) NOT VALID;

ALTER TABLE budget_lines
    ADD CONSTRAINT budget_lines_kind_check CHECK (kind IN ('gasto', 'ingreso')) NOT VALID,
    ADD CONSTRAINT budget_lines_status_check
        CHECK (status IN ('previsto', 'aprobado', 'pagado', 'cancelado')) NOT VALID,
    ADD CONSTRAINT budget_lines_department_check
        CHECK (department IN ('marketing', 'eventos', 'ingenieria')) NOT VALID;

-- Las reuniones y las notas pueden ser de todo el club: department = ''.
ALTER TABLE meetings
    ADD CONSTRAINT meetings_department_check
        CHECK (department IN ('', 'marketing', 'eventos', 'ingenieria')) NOT VALID;

ALTER TABLE notes
    ADD CONSTRAINT notes_department_check
        CHECK (department IN ('', 'marketing', 'eventos', 'ingenieria')) NOT VALID;

ALTER TABLE services
    ADD CONSTRAINT services_kind_check
        CHECK (kind IN ('alojamiento', 'base_datos', 'dominio', 'correo', 'codigo', 'mensajeria', 'otro')) NOT VALID,
    ADD CONSTRAINT services_status_check CHECK (status IN ('activo', 'pendiente', 'baja')) NOT VALID,
    ADD CONSTRAINT services_department_check
        CHECK (department IN ('marketing', 'eventos', 'ingenieria')) NOT VALID;

ALTER TABLE members
    ADD CONSTRAINT members_role_check
        CHECK (role IN ('', 'presidente', 'vicepresidente', 'boardmember')) NOT VALID,
    ADD CONSTRAINT members_departments_check
        CHECK (preferred_departments <@ ARRAY['marketing', 'eventos', 'ingenieria']::text[]) NOT VALID,
    ADD CONSTRAINT members_vp_of_check
        CHECK (vp_of <@ ARRAY['marketing', 'eventos', 'ingenieria']::text[]) NOT VALID;

ALTER TABLE registrations
    ADD CONSTRAINT registrations_status_check
        CHECK (status IN ('pendiente', 'aceptado', 'rechazado', 'waitlist')) NOT VALID;
