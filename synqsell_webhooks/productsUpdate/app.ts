import { APIGatewayProxyResult } from 'aws-lambda';
import { PoolClient } from 'pg';
import { initializePool } from './db';
import { composeGid } from '@shopify/admin-graphql-api-utilities';
import { broadcastSupplierProductModifications, revertRetailerProductModifications } from './helper';
import { ShopifyEvent } from './types';

// ==============================================================================================================
// START: HELPER FUNCTIONS TO REACTIVATING PRODUCTS
// ==============================================================================================================
async function isRetailerProduct(shopifyProductId: string, client: PoolClient) {
    const productQuery = `SELECT FROM "ImportedProduct" WHERE "shopifyProductId" = $1 LIMIT 1`;
    const res = await client.query(productQuery, [shopifyProductId]);
    if (res.rows.length > 0) {
        return true;
    }
    return false;
}

async function isSupplierProduct(shopifyProductId: string, client: PoolClient) {
    const productQuery = `SELECT FROM "Product" WHERE "shopifyProductId" = $1 LIMIT 1`;
    const res = await client.query(productQuery, [shopifyProductId]);
    if (res.rows.length > 0) {
        return true;
    }
    return false;
}

export const lambdaHandler = async (event: ShopifyEvent): Promise<APIGatewayProxyResult> => {
    let client: null | PoolClient = null;
    try {
        const pool = initializePool();
        client = await pool.connect();
        const payload = event.detail.payload;
        const shopifyProductId = payload.admin_graphql_api_id;
        const [isRetailerProductResult, isSupplierProductResult] = await Promise.all([
            isRetailerProduct(shopifyProductId, client),
            isSupplierProduct(shopifyProductId, client),
        ]);

        if (!isSupplierProductResult && !isRetailerProductResult) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: 'We do not need to handle logic for products not in Synqsell.',
                }),
            };
        }

        // there is no old price, so we cannot check if the variant price has been updated
        // even though it consumes GraphQL resources, we are going to broadcast the price changes
        const newProductStatus = payload.status;
        const editedVariants = payload.variants.map((variant) => ({
            shopifyVariantId: composeGid('ProductVariant', variant.id),
            hasUpdatedInventory: variant.inventory_quantity !== variant.old_inventory_quantity,
            newInventory: variant.inventory_quantity,
            price: variant.price,
        }));

        if (isSupplierProductResult) {
            await broadcastSupplierProductModifications(editedVariants, newProductStatus, shopifyProductId, client);
        } else if (isRetailerProductResult) {
            await revertRetailerProductModifications(editedVariants, shopifyProductId, newProductStatus, client);
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Successfully handled product update webhook.',
            }),
        };
    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Failed to handle product update webhook.',
                error: (error as Error).message,
            }),
        };
    } finally {
        if (client) {
            client.release();
        }
    }
};
