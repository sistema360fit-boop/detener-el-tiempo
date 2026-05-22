import supabase from './server/config/supabase.js';

async function run() {
  const { data, error } = await supabase
    .from('AlertaStock')
    .update({ resuelta: true })
    .eq('id', '53eaa851-0183-4b55-9960-fed63e09f5ac');
  console.log("Error:", error);
  console.log("Data:", data);
}
run();
