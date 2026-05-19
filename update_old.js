import pkg from 'pg';
const { Client } = pkg;
const client = new Client({
  connectionString: 'postgresql://postgres.zrdhmfatqzwqvwsojzni:rot12345678901232121@aws-1-us-west-2.pooler.supabase.com:5432/postgres'
});

async function run() {
  await client.connect();
  console.log("Connected");
  try {
    const res = await client.query(`UPDATE "DetalleComanda" SET "estado_plato" = 'pendiente' WHERE "estado_plato" IS NULL;`);
    console.log(`Updated ${res.rowCount} rows`);
  } catch (e) { console.log(e.message); }
  await client.end();
}
run();
