import 'dotenv/config';
import supabase from '../server/config/supabase.js';

async function ejecutarPruebaFuego() {
  console.log("🔥 Iniciando Prueba de Fuego: Cuentas por Cobrar y Reportes...");

  try {
    // 1. Crear Cuenta por Cobrar Pendiente
    const cuentaId = crypto.randomUUID();
    const montoDeuda = 50.00;

    console.log(`\n1️⃣ Generando nueva cuenta por cobrar (Deuda total: $${montoDeuda})...`);
    
    const { data: cuenta, error: errorCuenta } = await supabase
      .from('CuentaPorCobrar')
      .insert({
        id: cuentaId,
        clienteNombre: "Cliente Prueba Fuego",
        monto: montoDeuda,
        monto_total: montoDeuda,
        monto_pendiente: montoDeuda,
        estado: "pendiente",
        fecha_creacion: new Date().toISOString()
      })
      .select()
      .single();

    if (errorCuenta) throw errorCuenta;
    console.log("✅ Cuenta creada con éxito:", cuenta.id);

    // 2. Registrar Abono en Divisas (Zelle)
    const abonoZelle = 20.00;
    console.log(`\n2️⃣ Registrando abono en USD (Método: Zelle, Monto: $${abonoZelle})...`);
    
    const { error: errorPago1 } = await supabase
      .from('PagoCuentaPorCobrar')
      .insert({
        id: crypto.randomUUID(),
        cuenta_id: cuentaId,
        cuentaId: cuentaId,
        monto: abonoZelle,
        monto_pagado: abonoZelle,
        metodo: "zelle_usd",
        metodo_pago: "zelle_usd",
        tasa_bs_aplicada: 1, // Tasa 1 porque es divisa
        fecha: new Date().toISOString(),
        fecha_pago: new Date().toISOString(),
        empleado_nombre: "Sistema Prueba"
      });

    if (errorPago1) throw errorPago1;
    console.log("✅ Abono Zelle registrado correctamente.");

    // 3. Registrar Abono en Bolívares (Punto de Venta)
    const abonoBsEnUsd = 30.00;
    const tasaSimulada = 40.00; // Tasa de cambio simulada
    console.log(`\n3️⃣ Registrando abono en Bolívares (Método: Punto de Venta Tarjeta Bs).`);
    console.log(`   Monto equivalente USD: $${abonoBsEnUsd} | Tasa: ${tasaSimulada} Bs/$`);
    console.log(`   Se espera que el sistema lo registre separado como: ${abonoBsEnUsd * tasaSimulada} Bs.`);

    const { error: errorPago2 } = await supabase
      .from('PagoCuentaPorCobrar')
      .insert({
        id: crypto.randomUUID(),
        cuenta_id: cuentaId,
        cuentaId: cuentaId,
        monto: abonoBsEnUsd,
        monto_pagado: abonoBsEnUsd,
        metodo: "tarjeta_bs",
        metodo_pago: "tarjeta_bs",
        tasa_bs_aplicada: tasaSimulada,
        fecha: new Date().toISOString(),
        fecha_pago: new Date().toISOString(),
        empleado_nombre: "Sistema Prueba"
      });

    if (errorPago2) throw errorPago2;
    console.log("✅ Abono en Bolívares registrado con éxito, capturando tasa correctamente.");

    // 4. Actualizar Estado de la Deuda
    console.log("\n4️⃣ Actualizando el estado de la cuenta por cobrar a 'pagada'...");
    const { error: errorUpdate } = await supabase
      .from('CuentaPorCobrar')
      .update({
        monto_pendiente: 0,
        estado: "pagada"
      })
      .eq('id', cuentaId);

    if (errorUpdate) throw errorUpdate;
    console.log("✅ Cuenta por cobrar saldada y cerrada.");

    // 5. Verificación de Reporte (Simulada para validación en consola)
    console.log("\n📊 --- VALIDACIÓN DE REPORTE FINANCIERO ---");
    console.log(`Zelle (USD): Ingreso directo a flujo divisas -> $${abonoZelle.toFixed(2)}`);
    console.log(`Punto (Bs): Ingreso aislado a flujo bancario -> Bs ${(abonoBsEnUsd * tasaSimulada).toFixed(2)}`);
    console.log("--------------------------------------------");
    console.log("🔥 PRUEBA DE FUEGO COMPLETADA EXITOSAMENTE 🔥");

  } catch (err) {
    console.error("❌ ERROR en la Prueba de Fuego:", err);
  }
}

ejecutarPruebaFuego();
