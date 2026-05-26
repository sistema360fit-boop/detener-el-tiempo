// scripts/migrate_nomina_direct.js
// Direct SQL migration using pg library against the Supabase PostgreSQL database
import 'dotenv/config';
import pg from 'pg';
const { Client } = pg;

async function migrate() {
  // Use the direct connection string (not the pooler for DDL)
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ DATABASE_URL not found');
    process.exit(1);
  }

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    console.log('✅ Conectado a PostgreSQL\n');

    const statements = [
      {
        label: '1. Crear tabla Nomina',
        sql: `CREATE TABLE IF NOT EXISTS "Nomina" (
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
        );`
      },
      {
        label: '2. Agregar columnas a Empleado',
        sql: `ALTER TABLE "Empleado" 
          ADD COLUMN IF NOT EXISTS salario_base FLOAT DEFAULT 0,
          ADD COLUMN IF NOT EXISTS cargo TEXT,
          ADD COLUMN IF NOT EXISTS cedula TEXT,
          ADD COLUMN IF NOT EXISTS telefono TEXT;`
      },
      {
        label: '3. Agregar columnas a Adelanto',
        sql: `ALTER TABLE "Adelanto"
          ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'PENDIENTE',
          ADD COLUMN IF NOT EXISTS fecha_descuento TIMESTAMP,
          ADD COLUMN IF NOT EXISTS nomina_id TEXT;`
      },
      {
        label: '4. Crear índice nomina_empleado',
        sql: `CREATE INDEX IF NOT EXISTS idx_nomina_empleado ON "Nomina"(empleado_id);`
      },
      {
        label: '5. Crear índice nomina_fecha',
        sql: `CREATE INDEX IF NOT EXISTS idx_nomina_fecha ON "Nomina"(fecha_pago);`
      },
      {
        label: '6. Crear índice adelanto_estado',
        sql: `CREATE INDEX IF NOT EXISTS idx_adelanto_estado ON "Adelanto"(estado);`
      },
    ];

    for (const stmt of statements) {
      try {
        await client.query(stmt.sql);
        console.log(`✅ ${stmt.label}`);
      } catch (err) {
        console.error(`❌ ${stmt.label}: ${err.message}`);
      }
    }

    // Verify
    console.log('\n📋 Verificando...');
    const { rows: nominaCols } = await client.query(`
      SELECT column_name, data_type FROM information_schema.columns 
      WHERE table_name = 'Nomina' ORDER BY ordinal_position;
    `);
    console.log('Columnas Nomina:', nominaCols.map(c => `${c.column_name} (${c.data_type})`).join(', '));

    const { rows: empCols } = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'Empleado' AND column_name IN ('salario_base', 'cargo', 'cedula', 'telefono');
    `);
    console.log('Nuevas columnas Empleado:', empCols.map(c => c.column_name).join(', '));

    const { rows: adelCols } = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'Adelanto' AND column_name IN ('estado', 'fecha_descuento', 'nomina_id');
    `);
    console.log('Nuevas columnas Adelanto:', adelCols.map(c => c.column_name).join(', '));

    console.log('\n🎉 ¡Migración completada exitosamente!');
  } catch (err) {
    console.error('💥 Error general:', err.message);
  } finally {
    await client.end();
  }
}

migrate();
