import { PoolClient } from 'pg';
import { Session } from '../../types';

async function getSessionFromShop(shop: string, client: PoolClient) {
    try {
        const sessionQuery = `SELECT * FROM "Session" WHERE shop = $1 LIMIT 1`;
        const sessionData = await client.query(sessionQuery, [shop]);
        if (sessionData.rows.length === 0) {
            throw new Error('Shop data is invalid.');
        }
        const session = sessionData.rows[0];
        return session as Session;
    } catch (error) {
        console.error(error);
        throw new Error(`Failed to get session from shop ${shop}.`);
    }
}

export default getSessionFromShop;
