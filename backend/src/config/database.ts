import pg from 'pg';
import env from './env.js';

const { Pool } = pg;
const databaseHost = new URL(env.databaseUrl).hostname;
const isLocalDatabase = ['localhost', '127.0.0.1'].includes(databaseHost);

const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: isLocalDatabase ? false : { rejectUnauthorized: false },
});

export default pool;
