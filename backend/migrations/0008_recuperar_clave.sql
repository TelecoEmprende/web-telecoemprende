-- Recuperar la contraseña: enlace de un solo uso que llega por email, y
-- contraseña provisional que pone un admin (la persona tiene que cambiarla al
-- entrar).
-- Del token solo se guarda su hash: quien lea la base de datos no puede
-- usarlo para entrar en nadie.
CREATE TABLE recuperacion_clave (
    token_hash CHAR(64) PRIMARY KEY,
    persona_id INTEGER NOT NULL REFERENCES equipo_accesos(id) ON DELETE CASCADE,
    creado_en TIMESTAMP NOT NULL DEFAULT NOW(),
    expira TIMESTAMP NOT NULL
);
CREATE INDEX recuperacion_clave_persona_idx ON recuperacion_clave (persona_id);

ALTER TABLE equipo_accesos ADD COLUMN debe_cambiar_clave BOOLEAN NOT NULL DEFAULT FALSE;
