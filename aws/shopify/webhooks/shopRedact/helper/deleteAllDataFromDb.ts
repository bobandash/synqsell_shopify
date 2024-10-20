import { PoolClient } from 'pg';

async function deleteAllDataFromDb(sessionId: string, client: PoolClient) {
    try {
        const query = `
            DELETE FROM "Session"
            WHERE id = $1
        `;
        await client.query(query, [sessionId]);
    } catch (error) {
        console.error(error);
        throw new Error(`Failed to delete all data from database for session ${sessionId}.`);
    }
}

export default deleteAllDataFromDb;
