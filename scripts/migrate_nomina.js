// scripts/migrate_nomina.js
// Migration script to add Nomina table and update Adelanto/Empleado tables in Supabase
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runSQL(sql, label) {
  console.log(`\n🔄 ${label}...`);
  const { data, error } = await supabase.rpc('exec_sql', { sql });
  if (error) {
    // Try alternative: direct query via REST
    console.log(`⚠️  RPC not available, trying direct...`);
    const resp = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ sql })
    });
    if (!resp.ok) {
      const txt = await resp.text();
      console.log(`⚠️  ${label}: ${txt}`);
      return false;
    }
  }
  console.log(`✅ ${label} completado`);
  return true;
}

async function migrate() {
  console.log('🚀 Iniciando migración de Nómina...\n');

  // 1. Add new columns to Empleado
  const alterEmpleado = `
    ALTER TABLE "Empleado" 
      ADD COLUMN IF NOT EXISTS salario_base FLOAT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS cargo TEXT,
      ADD COLUMN IF NOT EXISTS cedula TEXT,
      ADD COLUMN IF NOT EXISTS telefono TEXT;
  `;
  
  // 2. Add new columns to Adelanto
  const alterAdelanto = `
    ALTER TABLE "Adelanto"
      ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'PENDIENTE',
      ADD COLUMN IF NOT EXISTS fecha_descuento TIMESTAMP,
      ADD COLUMN IF NOT EXISTS nomina_id TEXT;
  `;

  // 3. Create Nomina table
  const createNomina = `
    CREATE TABLE IF NOT EXISTS "Nomina" (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      empleado_id TEXT,
      empleado_nombre TEXT,
      periodo_inicio DATE,
      periodo_fin DATE,
      salario_base FLOAT DEFAULT 0,
      total_adelantos FLOAT DEFAULT 0,
      salario_neto FLOAT DEFAULT 0,
      metodo_pago TEXT,
      moneda_pago TEXT DEFAULT 'USD',
      tasa_cambio FLOAT DEFAULT 1,
      monto_convertido FLOAT DEFAULT 0,
      estado TEXT DEFAULT 'PAGADO',
      notas TEXT,
      fecha_pago TIMESTAMP DEFAULT now(),
      "createdAt" TIMESTAMP DEFAULT now()
    );
  `;

  // 4. Add index for performance
  const createIndex = `
    CREATE INDEX IF NOT EXISTS idx_nomina_empleado ON "Nomina"(empleado_id);
    CREATE INDEX IF NOT EXISTS idx_nomina_fecha ON "Nomina"(fecha_pago);
    CREATE INDEX IF NOT EXISTS idx_adelanto_estado ON "Adelanto"(estado);
  `;

  // Try using SQL Editor approach (direct fetch to PostgreSQL)
  const migrations = [
    { sql: alterEmpleado, label: 'Agregar columnas a Empleado (salario_base, cargo, cedula, telefono)' },
    { sql: alterAdelanto, label: 'Agregar columnas a Adelanto (estado, fecha_descuento, nomina_id)' },
    { sql: createNomina, label: 'Crear tabla Nomina' },
    { sql: createIndex, label: 'Crear índices de rendimiento' },
  ];

  for (const m of migrations) {
    // Use Supabase's SQL execution via PostgREST
    try {
      const resp = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ sql: m.sql })
      });
      if (resp.ok) {
        console.log(`✅ ${m.label}`);
      } else {
        const txt = await resp.text();
        console.log(`⚠️  ${m.label}: ${txt}`);
      }
    } catch (err) {
      console.log(`❌ ${m.label}: ${err.message}`);
    }
  }

  // Verify tables exist by trying to select from them
  console.log('\n📋 Verificando estructura...');
  
  const { data: nominas, error: nomError } = await supabase.from('Nomina').select('*').limit(1);
  if (nomError) {
    console.log('⚠️  Tabla Nomina no accesible:', nomError.message);
    console.log('\n📌 ACCIÓN REQUERIDA: Ejecuta el siguiente SQL en el SQL Editor de Supabase:');
    console.log('─'.repeat(70));
    console.log(createNomina);
    console.log(alterEmpleado);
    console.log(alterAdelanto);
    console.log(createIndex);
    console.log('─'.repeat(70));
  } else {
    console.log('✅ Tabla Nomina accesible');
  }

  // Check Empleado columns
  const { data: emp, error: empError } = await supabase.from('Empleado').select('salario_base').limit(1);
  if (empError && empError.message.includes('salario_base')) {
    console.log('⚠️  Columna salario_base no existe en Empleado');
    console.log('📌 Ejecuta: ALTER TABLE "Empleado" ADD COLUMN IF NOT EXISTS salario_base FLOAT DEFAULT 0;');
  } else {
    console.log('✅ Columna salario_base en Empleado verificada');
  }

  // Check Adelanto columns
  const { data: adel, error: adelError } = await supabase.from('Adelanto').select('estado').limit(1);
  if (adelError && adelError.message.includes('estado')) {
    console.log('⚠️  Columna estado no existe en Adelanto');
  } else {
    console.log('✅ Columna estado en Adelanto verificada');
  }

  console.log('\n🎉 Migración completada!');
}

migrate().catch(err => {
  console.error('💥 Error en migración:', err);
  process.exit(1);
});
