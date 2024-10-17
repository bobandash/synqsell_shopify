import { PoolClient } from 'pg';
import { Session } from '../types';
// ==============================================================================================================
// START: HELPER FUNCTIONS FOR DELETING ALL DATA FROM SHOPIFY THAT NEEDS TO BE DELETED
// ==============================================================================================================
async function isSupplier(sessionId: string, client: PoolClient) {
    try {
        const query = `
          SELECT * FROM "Role"
          WHERE "name" = $1 AND "sessionId" = $2
          LIMIT 1
      `;
        const res = await client.query(query, [ROLES.SUPPLIER, sessionId]);
        return res.rows.length > 0;
    } catch (error) {
        console.error(error);
        throw new Error(`Failed to check if session id ${sessionId} is a supplier.`);
    }
}

async function getAllImportedProductDetails(supplierId: string, client: PoolClient) {}

async function groupByRetailer(importedProductDetails) {}

// ==============================================================================================================
// START: END HELPER FUNCTIONS FOR DELETING ALL DATA FROM SHOPIFY THAT NEEDS TO BE DELETED
// ==============================================================================================================

async function deleteDataFromShopify(session: Session) {}

export default deleteDataFromShopify;
