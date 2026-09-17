CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(120) NOT NULL,
    correo VARCHAR(320) NOT NULL,
    hash_password VARCHAR(60) NOT NULL,
    rol VARCHAR(30) NOT NULL DEFAULT 'OPERADOR',
    two_fa_secret VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT usuarios_rol_check CHECK (rol IN ('ADMIN', 'SUPERVISOR', 'OPERADOR'))
);

CREATE UNIQUE INDEX IF NOT EXISTS usuarios_correo_lower_unique
    ON usuarios (LOWER(correo));

CREATE INDEX IF NOT EXISTS usuarios_rol_idx ON usuarios (rol);

COMMENT ON TABLE usuarios IS 'Usuarios internos del SaaS de trazabilidad agroexportadora';
COMMENT ON COLUMN usuarios.hash_password IS 'Hash BCrypt; nunca almacenar contraseñas en texto plano';
COMMENT ON COLUMN usuarios.two_fa_secret IS 'Secreto TOTP cifrado en reposo en el entorno productivo';
