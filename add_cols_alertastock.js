import pkg from 'pg';
const { Client } = pkg;
const client = new Client({
  connectionString: 'postgresql://postgres.zrdhmfatqzwqvwsojzni:rot12345678901232121@aws-1-us-west-2.pooler.supabase.com:5432/postgres'
});

async function run() {
  await client.connect();
  console.log("Connected");
  
  const queries = [
    `ALTER TABLE "AlertaStock" ADD COLUMN "resuelta" BOOLEAN DEFAULT false;`
  ];

  for (const q of queries) {
    try {
      await client.query(q);
      console.log("Executed:", q);
    } catch (e) {
      console.log("Error or already exists:", e.message);
    }
  }
  
  await client.end();
}
run();
