import { PoolClient } from 'pg';

async function deleteAllDataFromDb(sessionId: string, client: PoolClient) {
    const query = `
        DELETE FROM "Session"
        WHERE id = $1
    `;
    await client.query(query, [sessionId]);
}

export default deleteAllDataFromDb;
