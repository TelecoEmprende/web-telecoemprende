-- Perfil de LinkedIn de cada cuenta (Cuentas del equipo): la foto de la
-- sección «Equipo» de la web enlaza a él. "" = sin perfil.
ALTER TABLE equipo_accesos ADD COLUMN IF NOT EXISTS linkedin TEXT NOT NULL DEFAULT '';
