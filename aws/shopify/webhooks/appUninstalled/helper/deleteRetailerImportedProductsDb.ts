import { PoolClient } from 'pg';

async function deleteRetailerImportedProductsDb(retailerId: string, client: PoolClient) {
    try {
        const query = `
        DELETE FROM "ImportedProduct"
        WHERE "retailerId" = $1
      `;
        await client.query(query, [retailerId]);
    } catch (error) {
        console.error(`Failed to delete all retailer imported products from the database for retailer ${retailerId}`);
        throw error;
    }
}

export default deleteRetailerImportedProductsDb;
