-- Esquema de partida: el que dejaban los antiguos `init_*_db()` del backend
-- hasta octubre de 2026. Todo es idempotente (IF NOT EXISTS / IS NULL) porque
-- producción ya lo tiene: ahí esta migración no cambia nada y solo queda
-- apuntada; en una base vacía (tests, local) la crea entera.

-- Inscripciones -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS registrations (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(60) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    estudios VARCHAR(120) NOT NULL,
    email VARCHAR(120) NOT NULL,
    drive_link VARCHAR(300) NOT NULL DEFAULT '',
    privacidad_aceptada VARCHAR(10) NOT NULL,
    ip_registro VARCHAR(45) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    evento VARCHAR(50) NOT NULL,
    CONSTRAINT registrations_email_evento_key UNIQUE (email, evento)
);
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS departamento VARCHAR(40) NOT NULL DEFAULT '';
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS escuela VARCHAR(150) NOT NULL DEFAULT '';
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS nivel VARCHAR(20) NOT NULL DEFAULT '';
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS telefono VARCHAR(20) NOT NULL DEFAULT '';
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS estado VARCHAR(20) NOT NULL DEFAULT 'pendiente';
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS notificado BOOLEAN NOT NULL DEFAULT FALSE;

-- Cuentas de /equipo --------------------------------------------------------
CREATE TABLE IF NOT EXISTS equipo_accesos (
    id SERIAL PRIMARY KEY,
    email VARCHAR(120) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    equipos TEXT[] NOT NULL DEFAULT '{}',
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
ALTER TABLE equipo_accesos ADD COLUMN IF NOT EXISTS vp_de TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE equipo_accesos ADD COLUMN IF NOT EXISTS cargo VARCHAR(20) NOT NULL DEFAULT '';
ALTER TABLE equipo_accesos ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE equipo_accesos ADD COLUMN IF NOT EXISTS notas TEXT NOT NULL DEFAULT '';
ALTER TABLE equipo_accesos ADD COLUMN IF NOT EXISTS nombre VARCHAR(80) NOT NULL DEFAULT '';
ALTER TABLE equipo_accesos ADD COLUMN IF NOT EXISTS dni VARCHAR(20) NOT NULL DEFAULT '';
ALTER TABLE equipo_accesos ADD COLUMN IF NOT EXISTS correo_personal VARCHAR(120) NOT NULL DEFAULT '';
ALTER TABLE equipo_accesos ADD COLUMN IF NOT EXISTS foto TEXT NOT NULL DEFAULT '';
ALTER TABLE equipo_accesos ADD COLUMN IF NOT EXISTS apellidos VARCHAR(80) NOT NULL DEFAULT '';
ALTER TABLE equipo_accesos ADD COLUMN IF NOT EXISTS registro_id INTEGER
    REFERENCES registrations(id) ON DELETE SET NULL;
-- es_admin y en_web nacieron sin default para dar a las filas que ya existían
-- un valor calculado (ver el historial de git de services/equipo.py).
ALTER TABLE equipo_accesos ADD COLUMN IF NOT EXISTS es_admin BOOLEAN;
UPDATE equipo_accesos
SET es_admin = ('ingenieria' = ANY(equipos) OR cargo IN ('presidente', 'boardmember'))
WHERE es_admin IS NULL;
ALTER TABLE equipo_accesos ALTER COLUMN es_admin SET DEFAULT FALSE;
ALTER TABLE equipo_accesos ADD COLUMN IF NOT EXISTS en_web BOOLEAN;
UPDATE equipo_accesos SET en_web = TRUE WHERE en_web IS NULL;
ALTER TABLE equipo_accesos ALTER COLUMN en_web SET DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS calendario_eventos (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(150) NOT NULL,
    descripcion VARCHAR(500) NOT NULL DEFAULT '',
    fecha DATE NOT NULL,
    hora VARCHAR(5) NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
ALTER TABLE calendario_eventos ADD COLUMN IF NOT EXISTS confirmados TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE calendario_eventos ADD COLUMN IF NOT EXISTS asistio TEXT[] NOT NULL DEFAULT '{}';

-- Proyectos, entregables, tareas --------------------------------------------
CREATE TABLE IF NOT EXISTS campaigns (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(160) NOT NULL,
    objetivo TEXT NOT NULL DEFAULT '',
    audiencia TEXT NOT NULL DEFAULT '',
    fecha DATE,
    creado_por VARCHAR(120) NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS departamento VARCHAR(20) NOT NULL DEFAULT 'marketing';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS archivado BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS contents (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    titulo VARCHAR(160) NOT NULL,
    tipo VARCHAR(20) NOT NULL DEFAULT '',
    plataforma VARCHAR(20) NOT NULL DEFAULT '',
    fecha_publicacion DATE,
    estado VARCHAR(20) NOT NULL DEFAULT 'idea',
    script TEXT NOT NULL DEFAULT '',
    copy_texto TEXT NOT NULL DEFAULT '',
    cta VARCHAR(200) NOT NULL DEFAULT '',
    hashtags TEXT NOT NULL DEFAULT '',
    idea_visual TEXT NOT NULL DEFAULT '',
    responsables TEXT[] NOT NULL DEFAULT '{}',
    enlaces TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    departamento VARCHAR(20) NOT NULL DEFAULT 'marketing',
    campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
    content_id INTEGER REFERENCES contents(id) ON DELETE CASCADE,
    titulo VARCHAR(160) NOT NULL,
    descripcion TEXT NOT NULL DEFAULT '',
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    prioridad VARCHAR(10) NOT NULL DEFAULT 'media',
    deadline DATE,
    responsables TEXT[] NOT NULL DEFAULT '{}',
    tags TEXT[] NOT NULL DEFAULT '{}',
    checklist JSONB NOT NULL DEFAULT '[]',
    enlaces TEXT[] NOT NULL DEFAULT '{}',
    creado_por VARCHAR(120) NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS hora VARCHAR(5) NOT NULL DEFAULT '';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completado_en TIMESTAMP;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS instrucciones TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS contents_campaign_idx ON contents (campaign_id);
CREATE INDEX IF NOT EXISTS tasks_content_idx ON tasks (content_id);
CREATE INDEX IF NOT EXISTS tasks_campaign_idx ON tasks (campaign_id);

CREATE TABLE IF NOT EXISTS task_comments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    autor VARCHAR(120) NOT NULL DEFAULT '',
    texto TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS task_comments_task_idx ON task_comments (task_id);

-- Presupuesto, reuniones, servicios ----------------------------------------
CREATE TABLE IF NOT EXISTS presupuesto_lineas (
    id SERIAL PRIMARY KEY,
    departamento VARCHAR(20) NOT NULL,
    concepto VARCHAR(160) NOT NULL,
    tipo VARCHAR(10) NOT NULL DEFAULT 'gasto',
    importe NUMERIC(10, 2) NOT NULL DEFAULT 0,
    estado VARCHAR(20) NOT NULL DEFAULT 'previsto',
    fecha DATE,
    notas TEXT NOT NULL DEFAULT '',
    creado_por VARCHAR(120) NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS reuniones (
    id SERIAL PRIMARY KEY,
    departamento VARCHAR(20) NOT NULL,
    titulo VARCHAR(160) NOT NULL,
    fecha DATE,
    hora VARCHAR(5) NOT NULL DEFAULT '',
    objetivo TEXT NOT NULL DEFAULT '',
    asistentes TEXT[] NOT NULL DEFAULT '{}',
    acta TEXT NOT NULL DEFAULT '',
    creado_por VARCHAR(120) NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS servicios (
    id SERIAL PRIMARY KEY,
    departamento VARCHAR(20) NOT NULL,
    nombre VARCHAR(120) NOT NULL,
    tipo VARCHAR(20) NOT NULL DEFAULT 'otro',
    url TEXT NOT NULL DEFAULT '',
    responsables TEXT[] NOT NULL DEFAULT '{}',
    renovacion DATE,
    estado VARCHAR(20) NOT NULL DEFAULT 'activo',
    notas TEXT NOT NULL DEFAULT '',
    creado_por VARCHAR(120) NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
ALTER TABLE servicios ADD COLUMN IF NOT EXISTS visible_club BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS presupuesto_lineas_depto_idx ON presupuesto_lineas (departamento);
CREATE INDEX IF NOT EXISTS reuniones_depto_idx ON reuniones (departamento);
CREATE INDEX IF NOT EXISTS servicios_depto_idx ON servicios (departamento);

-- Notas ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notas (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(160) NOT NULL DEFAULT '',
    contenido JSONB NOT NULL DEFAULT '[]'::jsonb,
    departamento VARCHAR(20) NOT NULL DEFAULT '',
    privada BOOLEAN NOT NULL DEFAULT FALSE,
    fijada BOOLEAN NOT NULL DEFAULT FALSE,
    creado_por VARCHAR(120) NOT NULL DEFAULT '',
    editado_por VARCHAR(120) NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
ALTER TABLE notas ADD COLUMN IF NOT EXISTS proyecto_id INTEGER;

-- Auditoría -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auditoria (
    id SERIAL PRIMARY KEY,
    momento TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    email VARCHAR(120) NOT NULL DEFAULT '',
    metodo VARCHAR(8) NOT NULL,
    ruta VARCHAR(255) NOT NULL,
    estado INTEGER NOT NULL,
    ip VARCHAR(64) NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS auditoria_momento_idx ON auditoria (momento DESC);
