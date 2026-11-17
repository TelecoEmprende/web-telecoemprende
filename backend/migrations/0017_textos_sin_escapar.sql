-- `limpiar_texto` guardaba los textos con el HTML escapado («O'Brien» como
-- `O&#x27;Brien`), y React los pintaba tal cual. Ya no escapa (ver
-- services/security.py); esto devuelve lo guardado a su texto real. `&amp;` va
-- la última para no convertir un `&amp;lt;` escrito a mano en `<`.
CREATE FUNCTION pg_temp.desescapar(texto TEXT) RETURNS TEXT
LANGUAGE sql IMMUTABLE AS $$
    SELECT replace(replace(replace(replace(replace(texto,
        '&lt;', '<'), '&gt;', '>'), '&quot;', '"'), '&#x27;', ''''), '&amp;', '&')
$$;

UPDATE members SET
    first_name = pg_temp.desescapar(first_name),
    last_name = pg_temp.desescapar(last_name),
    id_document = pg_temp.desescapar(id_document),
    email = pg_temp.desescapar(email)
WHERE concat(first_name, last_name, id_document, email) ~ '&(lt|gt|quot|#x27|amp);';

UPDATE registrations SET
    first_name = pg_temp.desescapar(first_name),
    last_name = pg_temp.desescapar(last_name),
    studies = pg_temp.desescapar(studies),
    school = pg_temp.desescapar(school),
    level = pg_temp.desescapar(level),
    phone = pg_temp.desescapar(phone),
    department = pg_temp.desescapar(department),
    email = pg_temp.desescapar(email),
    drive_link = pg_temp.desescapar(drive_link)
WHERE concat(first_name, last_name, studies, school, level, phone, department, email, drive_link)
    ~ '&(lt|gt|quot|#x27|amp);';

UPDATE club_events SET
    title = pg_temp.desescapar(title),
    description = pg_temp.desescapar(description)
WHERE concat(title, description) ~ '&(lt|gt|quot|#x27|amp);';

-- Enlaces de tareas y entregables: ahora solo http(s) (ver `_lista_urls` en
-- api/marketing.py). Los que no traían esquema se completan con https://; los
-- de otro esquema (`javascript:`, `data:`) se quitan.
UPDATE tasks SET links = ARRAY(
    SELECT CASE WHEN l ~* '^https?://' THEN l ELSE 'https://' || l END
    FROM unnest(links) WITH ORDINALITY AS u(l, orden)
    WHERE l ~* '^https?://' OR l !~* '^[a-z][a-z0-9+.-]*:'
    ORDER BY orden
)
WHERE EXISTS (SELECT 1 FROM unnest(links) l WHERE l !~* '^https?://');

UPDATE deliverables SET links = ARRAY(
    SELECT CASE WHEN l ~* '^https?://' THEN l ELSE 'https://' || l END
    FROM unnest(links) WITH ORDINALITY AS u(l, orden)
    WHERE l ~* '^https?://' OR l !~* '^[a-z][a-z0-9+.-]*:'
    ORDER BY orden
)
WHERE EXISTS (SELECT 1 FROM unnest(links) l WHERE l !~* '^https?://');
