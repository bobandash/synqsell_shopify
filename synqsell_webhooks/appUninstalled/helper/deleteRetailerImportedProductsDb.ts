import { PoolClient } from 'pg';

async function deleteRetailerImportedProductsDb(retailerId: string, client: PoolClient) {
    try {
        const query = `
        DELETE FROM "ImportedProduct"
        WHERE "retailerId" = $1
      `;
        const res = await client.query(query, [retailerId]);
        console.log(`Deleted ${res.rows.length} imported products from retailerId ${retailerId} in database.`);
    } catch (error) {
        console.error(error);
        throw new Error(`Failed to delete all retailer imported products from the database for retailer ${retailerId}`);
    }
}

export default deleteRetailerImportedProductsDb;
