-- Tablas y columnas en inglés (octubre de 2026). Hasta aquí convivían
-- `campaigns`/`tasks` con `reuniones`/`notas`, y `created_at` con `creado_en`.
--
-- Las vistas `_v` siguen siendo la forma en que la API lee: personas como
-- emails y columnas con el nombre de su campo en el JSON (`titulo`, `estado`,
-- `campaign_id`...), que el frontend no cambia. Postgres reescribe solo su
-- definición al renombrar una columna y conserva el nombre de salida, así
-- que aquí solo cambian de nombre las vistas.
--
-- Solo renombra: no se mueve ni se borra ningún dato.

-- Tablas ---------------------------------------------------------------------
ALTER TABLE equipo_accesos RENAME TO members;
ALTER TABLE calendario_eventos RENAME TO club_events;
ALTER TABLE campaigns RENAME TO projects;
ALTER TABLE contents RENAME TO deliverables;
ALTER TABLE presupuesto_lineas RENAME TO budget_lines;
ALTER TABLE reuniones RENAME TO meetings;
ALTER TABLE servicios RENAME TO services;
ALTER TABLE notas RENAME TO notes;
ALTER TABLE historial RENAME TO history;
ALTER TABLE auditoria RENAME TO audit_log;
ALTER TABLE recuperacion_clave RENAME TO password_resets;
ALTER TABLE tarea_responsables RENAME TO task_assignees;
ALTER TABLE entregable_responsables RENAME TO deliverable_assignees;
ALTER TABLE reunion_asistentes RENAME TO meeting_attendees;
ALTER TABLE servicio_responsables RENAME TO service_owners;

-- Vistas ---------------------------------------------------------------------
ALTER VIEW campaigns_v RENAME TO projects_v;
ALTER VIEW contents_v RENAME TO deliverables_v;
ALTER VIEW presupuesto_lineas_v RENAME TO budget_lines_v;
ALTER VIEW reuniones_v RENAME TO meetings_v;
ALTER VIEW servicios_v RENAME TO services_v;
ALTER VIEW notas_v RENAME TO notes_v;
-- Ya no la lee nadie (fuera el «voy» y el check-in): club_events se lee tal cual.
DROP VIEW calendario_eventos_v;

-- Columnas -------------------------------------------------------------------
-- members: `preferred_departments` es el orden de preferencia 1ª/2ª/3ª (siempre
-- lleva los tres), no "a qué departamentos pertenece".
ALTER TABLE members RENAME COLUMN equipos TO preferred_departments;
ALTER TABLE members RENAME COLUMN activo TO active;
ALTER TABLE members RENAME COLUMN vp_de TO vp_of;
ALTER TABLE members RENAME COLUMN cargo TO role;
ALTER TABLE members RENAME COLUMN notas TO notes;
ALTER TABLE members RENAME COLUMN nombre TO first_name;
ALTER TABLE members RENAME COLUMN apellidos TO last_name;
ALTER TABLE members RENAME COLUMN dni TO id_document;
ALTER TABLE members RENAME COLUMN foto TO photo;
ALTER TABLE members RENAME COLUMN registro_id TO registration_id;
ALTER TABLE members RENAME COLUMN es_admin TO is_admin;
ALTER TABLE members RENAME COLUMN en_web TO on_website;
ALTER TABLE members RENAME COLUMN debe_cambiar_clave TO must_change_password;

ALTER TABLE registrations RENAME COLUMN nombre TO first_name;
ALTER TABLE registrations RENAME COLUMN apellidos TO last_name;
ALTER TABLE registrations RENAME COLUMN estudios TO studies;
ALTER TABLE registrations RENAME COLUMN privacidad_aceptada TO privacy_accepted;
ALTER TABLE registrations RENAME COLUMN ip_registro TO ip_address;
ALTER TABLE registrations RENAME COLUMN evento TO event;
ALTER TABLE registrations RENAME COLUMN departamento TO department;
ALTER TABLE registrations RENAME COLUMN escuela TO school;
ALTER TABLE registrations RENAME COLUMN nivel TO level;
ALTER TABLE registrations RENAME COLUMN telefono TO phone;
ALTER TABLE registrations RENAME COLUMN estado TO status;
ALTER TABLE registrations RENAME COLUMN notificado TO notified;

ALTER TABLE club_events RENAME COLUMN titulo TO title;
ALTER TABLE club_events RENAME COLUMN descripcion TO description;
ALTER TABLE club_events RENAME COLUMN fecha TO date;
ALTER TABLE club_events RENAME COLUMN hora TO start_time;

ALTER TABLE projects RENAME COLUMN nombre TO name;
ALTER TABLE projects RENAME COLUMN objetivo TO goal;
ALTER TABLE projects RENAME COLUMN audiencia TO audience;
ALTER TABLE projects RENAME COLUMN fecha TO date;
ALTER TABLE projects RENAME COLUMN archivado TO archived;
ALTER TABLE projects RENAME COLUMN creado_por_id TO created_by_id;
ALTER TABLE projects RENAME COLUMN departamentos TO departments;
ALTER TABLE projects RENAME COLUMN estado TO status;
ALTER TABLE projects RENAME COLUMN responsable_id TO owner_id;
ALTER TABLE projects RENAME CONSTRAINT campaigns_estado_check TO projects_status_check;

ALTER TABLE deliverables RENAME COLUMN campaign_id TO project_id;
ALTER TABLE deliverables RENAME COLUMN titulo TO title;
ALTER TABLE deliverables RENAME COLUMN tipo TO kind;
ALTER TABLE deliverables RENAME COLUMN plataforma TO platform;
ALTER TABLE deliverables RENAME COLUMN fecha_publicacion TO publish_date;
ALTER TABLE deliverables RENAME COLUMN estado TO status;
ALTER TABLE deliverables RENAME COLUMN copy_texto TO copy_text;
ALTER TABLE deliverables RENAME COLUMN idea_visual TO visual_idea;
ALTER TABLE deliverables RENAME COLUMN enlaces TO links;

ALTER TABLE tasks RENAME COLUMN departamento TO department;
ALTER TABLE tasks RENAME COLUMN campaign_id TO project_id;
ALTER TABLE tasks RENAME COLUMN content_id TO deliverable_id;
ALTER TABLE tasks RENAME COLUMN titulo TO title;
ALTER TABLE tasks RENAME COLUMN descripcion TO description;
ALTER TABLE tasks RENAME COLUMN estado TO status;
ALTER TABLE tasks RENAME COLUMN prioridad TO priority;
ALTER TABLE tasks RENAME COLUMN enlaces TO links;
ALTER TABLE tasks RENAME COLUMN hora TO due_time;
ALTER TABLE tasks RENAME COLUMN completado_en TO completed_at;
ALTER TABLE tasks RENAME COLUMN instrucciones TO instructions;
ALTER TABLE tasks RENAME COLUMN creado_por_id TO created_by_id;

ALTER TABLE task_comments RENAME COLUMN texto TO body;
ALTER TABLE task_comments RENAME COLUMN autor_id TO author_id;

ALTER TABLE budget_lines RENAME COLUMN departamento TO department;
ALTER TABLE budget_lines RENAME COLUMN concepto TO item;
ALTER TABLE budget_lines RENAME COLUMN tipo TO kind;
ALTER TABLE budget_lines RENAME COLUMN importe TO amount;
ALTER TABLE budget_lines RENAME COLUMN estado TO status;
ALTER TABLE budget_lines RENAME COLUMN fecha TO date;
ALTER TABLE budget_lines RENAME COLUMN notas TO notes;
ALTER TABLE budget_lines RENAME COLUMN creado_por_id TO created_by_id;

ALTER TABLE meetings RENAME COLUMN departamento TO department;
ALTER TABLE meetings RENAME COLUMN titulo TO title;
ALTER TABLE meetings RENAME COLUMN fecha TO date;
ALTER TABLE meetings RENAME COLUMN hora TO start_time;
ALTER TABLE meetings RENAME COLUMN objetivo TO goal;
ALTER TABLE meetings RENAME COLUMN contenido TO content;
ALTER TABLE meetings RENAME COLUMN creado_por_id TO created_by_id;

ALTER TABLE services RENAME COLUMN departamento TO department;
ALTER TABLE services RENAME COLUMN nombre TO name;
ALTER TABLE services RENAME COLUMN tipo TO kind;
ALTER TABLE services RENAME COLUMN renovacion TO renewal_date;
ALTER TABLE services RENAME COLUMN estado TO status;
ALTER TABLE services RENAME COLUMN notas TO notes;
ALTER TABLE services RENAME COLUMN visible_club TO visible_to_club;
ALTER TABLE services RENAME COLUMN creado_por_id TO created_by_id;

ALTER TABLE notes RENAME COLUMN titulo TO title;
ALTER TABLE notes RENAME COLUMN contenido TO content;
ALTER TABLE notes RENAME COLUMN departamento TO department;
ALTER TABLE notes RENAME COLUMN privada TO is_private;
ALTER TABLE notes RENAME COLUMN fijada TO pinned;
ALTER TABLE notes RENAME COLUMN proyecto_id TO project_id;
ALTER TABLE notes RENAME COLUMN creado_por_id TO created_by_id;
ALTER TABLE notes RENAME COLUMN editado_por_id TO edited_by_id;
ALTER TABLE notes RENAME CONSTRAINT notas_proyecto_fk TO notes_project_fk;

-- Los valores (`'proyecto'`, `'editar'`...) no cambian: son los de la API.
ALTER TABLE history RENAME COLUMN entidad TO entity_type;
ALTER TABLE history RENAME COLUMN entidad_id TO entity_id;
ALTER TABLE history RENAME COLUMN proyecto_id TO project_id;
ALTER TABLE history RENAME COLUMN accion TO action;
ALTER TABLE history RENAME COLUMN titulo TO title;
ALTER TABLE history RENAME COLUMN cambios TO changes;
ALTER TABLE history RENAME COLUMN persona_id TO member_id;
ALTER TABLE history RENAME COLUMN creado_en TO created_at;
ALTER TABLE history RENAME CONSTRAINT historial_entidad_check TO history_entity_type_check;
ALTER TABLE history RENAME CONSTRAINT historial_accion_check TO history_action_check;

ALTER TABLE audit_log RENAME COLUMN momento TO occurred_at;
ALTER TABLE audit_log RENAME COLUMN metodo TO method;
ALTER TABLE audit_log RENAME COLUMN ruta TO path;
ALTER TABLE audit_log RENAME COLUMN estado TO status;

ALTER TABLE password_resets RENAME COLUMN persona_id TO member_id;
ALTER TABLE password_resets RENAME COLUMN creado_en TO created_at;
ALTER TABLE password_resets RENAME COLUMN expira TO expires_at;

ALTER TABLE task_assignees RENAME COLUMN tarea_id TO task_id;
ALTER TABLE task_assignees RENAME COLUMN persona_id TO member_id;
ALTER TABLE task_assignees RENAME COLUMN orden TO position;
ALTER TABLE deliverable_assignees RENAME COLUMN entregable_id TO deliverable_id;
ALTER TABLE deliverable_assignees RENAME COLUMN persona_id TO member_id;
ALTER TABLE deliverable_assignees RENAME COLUMN orden TO position;
ALTER TABLE meeting_attendees RENAME COLUMN reunion_id TO meeting_id;
ALTER TABLE meeting_attendees RENAME COLUMN persona_id TO member_id;
ALTER TABLE meeting_attendees RENAME COLUMN orden TO position;
ALTER TABLE service_owners RENAME COLUMN servicio_id TO service_id;
ALTER TABLE service_owners RENAME COLUMN persona_id TO member_id;
ALTER TABLE service_owners RENAME COLUMN orden TO position;

-- Índices --------------------------------------------------------------------
ALTER INDEX IF EXISTS auditoria_momento_idx RENAME TO audit_log_occurred_at_idx;
ALTER INDEX IF EXISTS campaigns_papelera_idx RENAME TO projects_trash_idx;
ALTER INDEX IF EXISTS contents_papelera_idx RENAME TO deliverables_trash_idx;
ALTER INDEX IF EXISTS tasks_papelera_idx RENAME TO tasks_trash_idx;
ALTER INDEX IF EXISTS notas_papelera_idx RENAME TO notes_trash_idx;
ALTER INDEX IF EXISTS reuniones_papelera_idx RENAME TO meetings_trash_idx;
ALTER INDEX IF EXISTS contents_campaign_idx RENAME TO deliverables_project_idx;
ALTER INDEX IF EXISTS tasks_campaign_idx RENAME TO tasks_project_idx;
ALTER INDEX IF EXISTS tasks_content_idx RENAME TO tasks_deliverable_idx;
ALTER INDEX IF EXISTS presupuesto_lineas_depto_idx RENAME TO budget_lines_department_idx;
ALTER INDEX IF EXISTS reuniones_depto_idx RENAME TO meetings_department_idx;
ALTER INDEX IF EXISTS servicios_depto_idx RENAME TO services_department_idx;
ALTER INDEX IF EXISTS historial_entidad_idx RENAME TO history_entity_idx;
ALTER INDEX IF EXISTS historial_proyecto_idx RENAME TO history_project_idx;
ALTER INDEX IF EXISTS historial_reciente_idx RENAME TO history_recent_idx;
ALTER INDEX IF EXISTS recuperacion_clave_persona_idx RENAME TO password_resets_member_idx;
ALTER INDEX IF EXISTS tarea_responsables_persona_idx RENAME TO task_assignees_member_idx;
ALTER INDEX IF EXISTS entregable_responsables_persona_idx RENAME TO deliverable_assignees_member_idx;
ALTER INDEX IF EXISTS reunion_asistentes_persona_idx RENAME TO meeting_attendees_member_idx;
ALTER INDEX IF EXISTS servicio_responsables_persona_idx RENAME TO service_owners_member_idx;

-- La propia tabla de migraciones (la crea `migrar()` con `applied_at` en una
-- base nueva; en una que ya existía, se renombra).
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'schema_migrations' AND column_name = 'aplicada_en') THEN
        ALTER TABLE schema_migrations RENAME COLUMN aplicada_en TO applied_at;
    END IF;
END $$;
