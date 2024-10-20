import { PoolClient } from 'pg';

async function updateAppUninstalledStatus(sessionId: string, client: PoolClient) {
    try {
        const query = `
          UPDATE "Session"
          SET "isAppUninstalled" = true
          WHERE "id" = $1
        `;
        await client.query(query, [sessionId]);
    } catch (error) {
        console.error(error);
        throw new Error('Failed to update app status.');
    }
}

export default updateAppUninstalledStatus;
