import pkg from 'pg';
const { Client } = pkg;
const client = new Client({
  connectionString: 'postgresql://postgres.zrdhmfatqzwqvwsojzni:rot12345678901232121@aws-1-us-west-2.pooler.supabase.com:5432/postgres'
});

async function run() {
  await client.connect();
  const res = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'DetalleComanda';`);
  console.log(res.rows);
  await client.end();
}
run();
