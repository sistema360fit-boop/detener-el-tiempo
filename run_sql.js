import pkg from 'pg';
const { Client } = pkg;
const client = new Client({
  connectionString: 'postgresql://postgres.zrdhmfatqzwqvwsojzni:rot12345678901232121@aws-1-us-west-2.pooler.supabase.com:5432/postgres'
});

async function run() {
  await client.connect();
  console.log("Connected");
  try {
    await client.query('ALTER TABLE "Adelanto" ADD COLUMN "metodo_pago" TEXT;');
    console.log("Added metodo_pago");
  } catch (e) { console.log(e.message); }
  try {
    await client.query('ALTER TABLE "Adelanto" ADD COLUMN "moneda_original" TEXT;');
    console.log("Added moneda_original");
  } catch (e) { console.log(e.message); }
  try {
    await client.query('ALTER TABLE "Adelanto" ADD COLUMN "monto_original" DOUBLE PRECISION;');
    console.log("Added monto_original");
  } catch (e) { console.log(e.message); }
  try {
    await client.query('ALTER TABLE "Adelanto" ADD COLUMN "tasa_cambio" DOUBLE PRECISION;');
    console.log("Added tasa_cambio");
  } catch (e) { console.log(e.message); }
  await client.end();
}
run();
