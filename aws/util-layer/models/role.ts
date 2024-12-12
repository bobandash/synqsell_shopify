import { PoolClient } from "pg";
import { RolesOptions } from "../constants";

export async function hasRole(
  sessionId: string,
  role: RolesOptions,
  client: PoolClient
) {
  const query = `
      SELECT * FROM "Role"
      WHERE "name" = $1 AND "sessionId" = $2
      LIMIT 1
  `;
  const res = await client.query(query, [role, sessionId]);
  return res.rows.length > 0;
}
