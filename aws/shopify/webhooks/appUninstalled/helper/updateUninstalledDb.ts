import { PoolClient } from 'pg';

async function updateSessionStatus(sessionId: string, client: PoolClient) {
    const query = `
        UPDATE "Session"
        SET "isAppUninstalled" = true
        WHERE "id" = $1
    `;
    await client.query(query, [sessionId]);
}

async function removeBilling(sessionId: string, client: PoolClient) {
    const query = `
        DELETE FROM "Billing"
        WHERE "sessionId" = $1
    `;
    await client.query(query, [sessionId]);
}

async function updateUninstalledDb(sessionId: string, client: PoolClient) {
    try {
        await Promise.all([updateSessionStatus(sessionId, client), removeBilling(sessionId, client)]);
    } catch (error) {
        console.error('Failed to update billing and uninstalled status in database.');
        throw error;
    }
}

export default updateUninstalledDb;
