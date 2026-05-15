/**
 * Script para ejecutar los scripts SQL de creación de tablas
 * Uso: node scripts/run_sql_scripts.js
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Ruta a la base de datos SQLite
const dbPath = path.join(__dirname, '..', 'prisma', 'dev.db');

// Verificar si la base de datos existe
if (!fs.existsSync(dbPath)) {
  console.log('📦 Creando nueva base de datos SQLite...');
}

// Conectar a la base de datos
const db = new Database(dbPath);

// Habilitar claves foráneas
db.pragma('foreign_keys = ON');

console.log('✅ Conectado a la base de datos SQLite');

// Leer y ejecutar el script SQL completo
const sqlScriptPath = path.join(__dirname, 'create_tables.sql');
if (fs.existsSync(sqlScriptPath)) {
  console.log('📄 Ejecutando script SQL completo...');
  const sqlScript = fs.readFileSync(sqlScriptPath, 'utf8');
  
  // Dividir el script en statements individuales
  const statements = sqlScript
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
  
  let executed = 0;
  let errors = 0;
  
  for (const statement of statements) {
    try {
      if (statement.toUpperCase().includes('SELECT')) {
        // Ejecutar SELECT y mostrar resultados
        const result = db.prepare(statement).all();
        if (result.length > 0) {
          console.log('📊 Resultados:', result);
        }
      } else {
        // Ejecutar otros statements
        db.exec(statement);
        executed++;
      }
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log(`⚠️  Tabla ya existe (ignorando): ${error.message.split(':')[0]}`);
      } else {
        console.error(`❌ Error ejecutando statement: ${error.message}`);
        errors++;
      }
    }
  }
  
  console.log(`\n📈 Resumen:`);
  console.log(`   ✅ Statements ejecutados: ${executed}`);
  console.log(`   ❌ Errores: ${errors}`);
} else {
  console.error('❌ No se encontró el script SQL:', sqlScriptPath);
}

// Verificar tablas creadas
console.log('\n📋 Tablas en la base de datos:');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
tables.forEach(table => {
  console.log(`   - ${table.name}`);
});

// Cerrar conexión
db.close();
console.log('\n✅ Script completado');
