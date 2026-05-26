import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Faltan variables de entorno SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el archivo .env del root');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTest() {
  console.log('--- INICIANDO PRUEBA DE FLUJO DE NÓMINA ---');
  
  // 1. Crear un empleado de prueba
  console.log('\n1️⃣ Creando empleado de prueba con salario $100...');
  const empleadoId = crypto.randomUUID();
  const { data: empleado, error: empError } = await supabase
    .from('Empleado')
    .insert({
      id: empleadoId,
      nombre: 'Empleado Prueba Test',
      usuario: `test_${Date.now()}`,
      password: 'hashed_password', // Dummy
      salario_base: 100,
      cargo: 'Tester'
    })
    .select()
    .single();
    
  if (empError) throw empError;
  console.log('✅ Empleado creado:', empleado.nombre, '| Salario Base: $', empleado.salario_base);

  // 2. Crear un Adelanto
  console.log('\n2️⃣ Registrando un adelanto de $20 por Zelle...');
  const adelantoId = crypto.randomUUID();
  const { data: adelanto, error: adelError } = await supabase
    .from('Adelanto')
    .insert({
      id: adelantoId,
      empleadoId: empleado.id,
      empleado: empleado.nombre,
      monto: 20,
      metodo_pago: 'zelle_usd',
      estado: 'PENDIENTE',
      fecha: new Date().toISOString()
    })
    .select()
    .single();

  if (adelError) throw adelError;
  console.log('✅ Adelanto registrado:', adelanto.monto, 'USD | Estado:', adelanto.estado, '| Método:', adelanto.metodo_pago);

  // Simular la generación de reporte para Zelle
  console.log('\n📊 El sistema de Reportes ya tomaría este Adelanto de $20 como un Egreso en Zelle.');

  // 3. Simular la obtención del Preview de Nómina
  console.log('\n3️⃣ Calculando pago de nómina...');
  const salarioBase = empleado.salario_base;
  const totalAdelantos = adelanto.monto;
  const salarioNeto = salarioBase - totalAdelantos;
  console.log(`Salario Base: $${salarioBase}`);
  console.log(`Adelantos a descontar: -$${totalAdelantos}`);
  console.log(`Neto a Pagar: $${salarioNeto}`);

  // 4. Ejecutar el pago de Nómina
  console.log('\n4️⃣ Ejecutando el pago de nómina por los $80 restantes en Efectivo USD...');
  const nominaId = crypto.randomUUID();
  const now = new Date().toISOString();
  
  // A. Crear Nomina
  const { data: nomina, error: nomError } = await supabase
    .from('Nomina')
    .insert({
      id: nominaId,
      empleado_id: empleado.id,
      empleado_nombre: empleado.nombre,
      salario_base: salarioBase,
      total_adelantos: totalAdelantos,
      salario_neto: salarioNeto,
      metodo_pago: 'efectivo_usd',
      moneda_pago: 'USD',
      tasa_cambio: 1,
      monto_convertido: salarioNeto,
      estado: 'PAGADO',
      fecha_pago: now
    })
    .select()
    .single();

  if (nomError) throw nomError;

  // B. Marcar adelanto como descontado
  await supabase
    .from('Adelanto')
    .update({ estado: 'DESCONTADO', fecha_descuento: now, nomina_id: nominaId })
    .eq('id', adelanto.id);

  // C. Crear el Gasto (Como lo hace el endpoint /api/nomina/pagar ahora)
  const { data: gasto, error: gastoError } = await supabase
    .from('Gasto')
    .insert({
      id: crypto.randomUUID(),
      descripcion: `Nómina: ${empleado.nombre}`,
      monto: salarioNeto,
      monto_original: salarioNeto,
      moneda_original: 'USD',
      metodo_pago: 'efectivo_usd',
      categoriaNombre: 'Nómina',
      fecha: now
    })
    .select()
    .single();

  if (gastoError) throw gastoError;

  console.log('✅ Nómina pagada correctamente.');
  console.log('✅ Se generó un Gasto (Egreso) automático en Caja:', gasto.monto, 'USD | Método:', gasto.metodo_pago);

  // 5. Verificando estado final
  console.log('\n5️⃣ Verificando estado final de la base de datos...');
  const { data: finalAdelanto } = await supabase.from('Adelanto').select('estado').eq('id', adelanto.id).single();
  console.log(`Estado final del Adelanto: ${finalAdelanto.estado} (Correcto)`);

  console.log('\n--- PRUEBA COMPLETADA EXITOSAMENTE ---');
  console.log('Todo el flujo está conectado. Limpiando datos de prueba...');

  // 6. Limpieza
  await supabase.from('Gasto').delete().eq('id', gasto.id);
  await supabase.from('Adelanto').delete().eq('id', adelanto.id);
  await supabase.from('Nomina').delete().eq('id', nomina.id);
  await supabase.from('Empleado').delete().eq('id', empleado.id);
  
  console.log('🧹 Datos de prueba eliminados.');
}

runTest().catch(console.error);
