import supabase from './server/config/supabase.js';

async function run() {
  const { data, error } = await supabase.from('AlertaStock').select('*').limit(1);
  console.log("Error:", error);
  console.log("Data:", data);
}
run();
