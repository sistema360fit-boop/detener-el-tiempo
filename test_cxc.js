import 'dotenv/config';
import supabase from './server/config/supabase.js';

async function checkCuentas() {
  try {
    const { data: cuentas, error } = await supabase
      .from('CuentaPorCobrar')
      .select('*')
      .limit(5);
    
    if (error) throw error;
    console.log("Cuentas por Cobrar Pendientes:");
    console.log(JSON.stringify(cuentas, null, 2));
  } catch (error) {
    console.error("Error checking accounts:", error);
  }
}

checkCuentas();
