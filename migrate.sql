ALTER TABLE "CuentaPorCobrar" 
ADD COLUMN IF NOT EXISTS "monto_total" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN IF NOT EXISTS "monto_pendiente" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN IF NOT EXISTS "fecha_creacion" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS "comanda_numero" TEXT,
ADD COLUMN IF NOT EXISTS "cliente_telefono" TEXT;

ALTER TABLE "PagoCuentaPorCobrar"
ADD COLUMN IF NOT EXISTS "cuenta_id" TEXT,
ADD COLUMN IF NOT EXISTS "monto_pagado" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "metodo_pago" TEXT,
ADD COLUMN IF NOT EXISTS "fecha_pago" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS "tasa_bs_aplicada" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "notas" TEXT,
ADD COLUMN IF NOT EXISTS "empleado_nombre" TEXT;

-- For existing rows, update monto_total and monto_pendiente to equal monto if they are 0
UPDATE "CuentaPorCobrar" SET "monto_total" = "monto", "monto_pendiente" = "monto" WHERE "monto_total" = 0 OR "monto_total" IS NULL;
