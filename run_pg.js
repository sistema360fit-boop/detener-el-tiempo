import pg from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  await client.connect();
  console.log("Connected to PostgreSQL");
  
  const sql = fs.readFileSync('migrate.sql', 'utf8');
  console.log("Running SQL...");
  
  try {
    await client.query(sql);
    console.log("SQL executed successfully");
  } catch(e) {
    console.error("Error running SQL:", e);
  } finally {
    await client.end();
  }
}

run();
