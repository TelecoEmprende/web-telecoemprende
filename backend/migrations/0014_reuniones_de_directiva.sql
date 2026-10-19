-- Reuniones de la directiva: un ámbito más ('directiva', además de los tres
-- departamentos y '' = todo el club) y quién las ve. `board_only` = solo la
-- directiva (cargo, VP de algún departamento o admin); sin marcar, las ve todo
-- el club. Se lee en la vista como `solo_directiva`.
ALTER TABLE meetings DROP CONSTRAINT meetings_department_check;
ALTER TABLE meetings
    ADD CONSTRAINT meetings_department_check
        CHECK (department IN ('', 'marketing', 'eventos', 'ingenieria', 'directiva')) NOT VALID;

ALTER TABLE meetings ADD COLUMN board_only BOOLEAN NOT NULL DEFAULT FALSE;
-- Solo una reunión de directiva puede ser solo de la directiva: una de
-- departamento marcada así la dejaría escondida para su propio departamento.
ALTER TABLE meetings
    ADD CONSTRAINT meetings_board_only_check CHECK (NOT board_only OR department = 'directiva');

-- La columna nueva va al final: CREATE OR REPLACE solo deja añadir por detrás.
CREATE OR REPLACE VIEW meetings_v WITH (security_invoker = true) AS
SELECT r.id, r.department AS departamento, r.title AS titulo, r.date AS fecha,
       r.start_time AS hora, r.goal AS objetivo, r.content AS contenido,
       r.created_at, r.updated_at, r.created_by_id AS creado_por_id,
       ARRAY(SELECT p.email FROM meeting_attendees a JOIN members p ON p.id = a.member_id
             WHERE a.meeting_id = r.id ORDER BY a.position, p.email) AS asistentes,
       COALESCE((SELECT p.email FROM members p WHERE p.id = r.created_by_id), '') AS creado_por,
       r.board_only AS solo_directiva
FROM meetings r WHERE r.deleted_at IS NULL;
