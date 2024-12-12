import { PoolClient } from "pg";
import { Session } from "./types";

export async function getSessionFromShop(shop: string, client: PoolClient) {
  const query = `SELECT * FROM "Session" WHERE shop = $1 LIMIT 1`;
  const sessionData = await client.query(query, [shop]);
  if (sessionData.rows.length === 0) {
    throw new Error("Shop data is invalid.");
  }
  const session = sessionData.rows[0];
  return session as Session;
}

export async function getSessionFromId(sessionId: string, client: PoolClient) {
  const query = `SELECT * FROM "Session" WHERE id = $1 LIMIT 1`;
  const sessionData = await client.query(query, [sessionId]);
  if (sessionData.rows.length === 0) {
    throw new Error("Shop data is invalid.");
  }
  const session = sessionData.rows[0];
  return session as Session;
}

export async function updateUninstalledStatus(
  sessionId: string,
  isAppUninstalled: boolean,
  client: PoolClient
) {
  const query = `
      UPDATE "Session"
      SET "isAppUninstalled" = $1
      WHERE "id" = $2
  `;
  await client.query(query, [isAppUninstalled, sessionId]);
}
