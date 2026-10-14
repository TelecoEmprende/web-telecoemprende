-- Todos somos de los tres departamentos: `equipos` es el orden de preferencia
-- (1ª, 2ª, 3ª) y siempre lleva los tres. Se añaden al final los que faltaban,
-- en el orden marketing, eventos, ingeniería; el orden que ya había se respeta.
UPDATE equipo_accesos
SET equipos = equipos || ARRAY(
    SELECT d FROM unnest(ARRAY['marketing', 'eventos', 'ingenieria']) AS d
    WHERE d <> ALL (equipos)
)
WHERE cardinality(equipos) < 3;
