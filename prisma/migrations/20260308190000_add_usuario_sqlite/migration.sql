-- Create Usuario table for SQLite
CREATE TABLE IF NOT EXISTS "Usuario" (
    "id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    "email" TEXT NOT NULL UNIQUE,
    "password" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'administrador',
    "activo" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert default admin user (password: 1234, hashed with bcrypt)
-- Hash is for "1234"
INSERT OR IGNORE INTO "Usuario" (id, email, password, nombre, rol, activo, createdAt) 
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'admin',
    '$2b$10$1bb1xuJkWAog04KSGfIM7.Z.jxxoiWK70k0adu4GLU/vImvxMwFBq',
    'Administrador',
    'administrador',
    1,
    CURRENT_TIMESTAMP
);
