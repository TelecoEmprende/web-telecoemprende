-- Restos de lo que se quitó en Oct 2026 (recursos, anuncios, alumni y
-- decisiones; el onboarding y el mentor de cada cuenta). Ninguna migración
-- los crea: venían de los antiguos init_*_db(), así que pueden estar o no.
DROP TABLE IF EXISTS alumni, anuncios, recursos, decisiones;
ALTER TABLE members DROP COLUMN IF EXISTS onboarding, DROP COLUMN IF EXISTS mentor_email;
