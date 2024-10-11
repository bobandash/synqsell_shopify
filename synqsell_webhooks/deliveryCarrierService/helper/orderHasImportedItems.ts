import { PoolClient } from 'pg';

async function orderHasImportedItems(shopifyVariantIds: string[], client: PoolClient) {
    const numImportedVariantsQuery = `SELECT COUNT(*) FROM "ImportedVariant" WHERE "shopifyVariantId" IN ANY($1)`;
    const res = await client.query(numImportedVariantsQuery, shopifyVariantIds);
    const count = parseInt(res.rows[0].count);
    return count > 0;
}

export default orderHasImportedItems;
