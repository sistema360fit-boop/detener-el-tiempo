import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log("Migrando CuentaPorCobrar y PagoCuentaPorCobrar...");

  // Añadir columnas a CuentaPorCobrar
  const sql1 = `
    ALTER TABLE "CuentaPorCobrar" 
    ADD COLUMN IF NOT EXISTS "monto_total" DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS "monto_pendiente" DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS "fecha_creacion" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS "comanda_numero" TEXT,
    ADD COLUMN IF NOT EXISTS "cliente_telefono" TEXT;
  `;

  // Añadir columnas a PagoCuentaPorCobrar
  const sql2 = `
    ALTER TABLE "PagoCuentaPorCobrar"
    ADD COLUMN IF NOT EXISTS "cuenta_id" TEXT,
    ADD COLUMN IF NOT EXISTS "monto_pagado" DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS "metodo_pago" TEXT,
    ADD COLUMN IF NOT EXISTS "fecha_pago" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS "tasa_bs_aplicada" DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS "notas" TEXT,
    ADD COLUMN IF NOT EXISTS "empleado_nombre" TEXT;
  `;

  // Añadir columnas a CuentaPorCobrar
  const { error: err1 } = await supabase.rpc('execute_sql', { sql_string: sql1 });
  if (err1) console.log("Note: might not have RPC. Error:", err1.message);

  const { error: err2 } = await supabase.rpc('execute_sql', { sql_string: sql2 });
  if (err2) console.log("Note: might not have RPC. Error:", err2.message);
  
  console.log("Migration script ran. Please verify in Supabase.");
}

main().catch(console.error);
