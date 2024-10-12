import { PoolClient } from 'pg';

async function orderHasImportedItems(shopifyVariantIds: string[], client: PoolClient) {
    try {
        const numImportedVariantsQuery = `SELECT COUNT(*) FROM "ImportedVariant" WHERE "shopifyVariantId" = ANY($1)`;
        const res = await client.query(numImportedVariantsQuery, [shopifyVariantIds]);
        const count = parseInt(res.rows[0].count);
        return count > 0;
    } catch (error) {
        console.error(error);
        throw new Error('Failed to check whether the order has imported items.');
    }
}

export default orderHasImportedItems;
