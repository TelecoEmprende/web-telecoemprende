-- Intentos de login, alta y recuperación de contraseña por IP (ver
-- `demasiadas_peticiones` en services/security.py). Antes vivían en la memoria
-- de cada instancia: en Vercel cada una tenía su cuenta y se vaciaba en cada
-- arranque, así que el límite apenas frenaba nada. Las filas de más de un día
-- las borra el cron diario.
CREATE TABLE login_attempts (
    id BIGSERIAL PRIMARY KEY,
    bucket VARCHAR(40) NOT NULL,
    ip VARCHAR(64) NOT NULL,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX login_attempts_bucket_ip_at_idx ON login_attempts (bucket, ip, attempted_at);
