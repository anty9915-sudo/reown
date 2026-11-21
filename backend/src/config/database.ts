import pg from 'pg';
import env from './env.js';

const { Pool } = pg;

const pool = env.databaseUrl
  ? new Pool({
      connectionString: env.databaseUrl,
      ssl: ['localhost', '127.0.0.1'].includes(
        new URL(env.databaseUrl).hostname,
      )
        ? false
        : { rejectUnauthorized: false },
    })
  : ({} as InstanceType<typeof Pool>);

export default pool;
