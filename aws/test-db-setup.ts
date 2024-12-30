import initializePool from "@db/test-pool";
import { Pool, PoolClient } from "pg";

export type DatabaseSetup = {
  pool: Pool;
  client: PoolClient;
};

async function setupDatabase(): Promise<DatabaseSetup> {
  const pool = await initializePool();
  const client = await pool.connect();
  return { pool, client };
}
function disconnectClient(client: PoolClient | null) {
  if (client) {
    client.release();
  }
}

function teardownPool(pool: Pool | null) {
  if (pool) {
    pool.end();
  }
}

export { setupDatabase, disconnectClient, teardownPool };
