import pkg from 'pg';
const { Client } = pkg;
const client = new Client({
  connectionString: 'postgresql://postgres.zrdhmfatqzwqvwsojzni:rot12345678901232121@aws-1-us-west-2.pooler.supabase.com:5432/postgres'
});

async function run() {
  await client.connect();
  console.log("Connected");
  try {
    await client.query(`ALTER TABLE "DetalleComanda" ADD COLUMN "estado_plato" TEXT DEFAULT 'pendiente';`);
    console.log("Added estado_plato");
  } catch (e) { console.log(e.message); }
  try {
    await client.query(`ALTER TABLE "DetalleComanda" ADD COLUMN "notas_plato" TEXT;`);
    console.log("Added notas_plato");
  } catch (e) { console.log(e.message); }
  try {
    await client.query(`ALTER TABLE "DetalleComanda" ADD COLUMN "variante" TEXT;`);
    console.log("Added variante");
  } catch (e) { console.log(e.message); }
  await client.end();
}
run();
