import { Pool } from "pg";

let pool: Pool;

async function initializePool() {
  if (!pool) {
    pool = new Pool({
      user: process.env.DB_USERNAME,
      host: process.env.DB_HOST,
      database: process.env.DB_DATABASE,
      password: process.env.DB_PASSWORD,
      port: Number(process.env.DB_PORT),
      max: 20,
      ...(process.env.NODE_ENV === "test"
        ? {}
        : {
            ssl: {
              rejectUnauthorized: false,
            },
          }),
    });
  }
  return pool;
}

export { pool };
export default initializePool;
