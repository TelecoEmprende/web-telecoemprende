-- Tareas administrativas: no son de ningún departamento (mandar un correo,
-- renovar algo, papeleo) y salen en el tablero de los tres.
ALTER TABLE tasks DROP CONSTRAINT tasks_department_check;
ALTER TABLE tasks
    ADD CONSTRAINT tasks_department_check
        CHECK (department IN ('marketing', 'eventos', 'ingenieria', 'administrativo')) NOT VALID;
