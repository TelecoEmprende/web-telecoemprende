-- Columnas que el código ya no lee ni escribe:
--   equipo_accesos.correo_personal: el correo de la cuenta es el único (oct 2026).
--   campaigns.departamento: sustituida por `departamentos` (0006); la vista
--       campaigns_v saca el «principal» del propio ámbito.
--   reuniones.acta: sustituida por `contenido`, el acta en bloques (0006), que
--       ya recibió el texto que hubiera.
-- Se borran aquí en vez de dejarlas «por si acaso»: una columna que nadie usa
-- es un dato que alguien tendría que proteger sin saber para qué.
ALTER TABLE equipo_accesos DROP COLUMN IF EXISTS correo_personal;
ALTER TABLE campaigns DROP COLUMN IF EXISTS departamento;
ALTER TABLE reuniones DROP COLUMN IF EXISTS acta;
