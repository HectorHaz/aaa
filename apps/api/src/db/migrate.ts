import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './client.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(__dirname, 'schema.sql');

async function run() {
  const sql = await readFile(schemaPath, 'utf8');
  await pool.query(sql);
  console.log('Migration applied');
  await pool.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
