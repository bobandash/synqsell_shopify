import { composeGid } from '@shopify/admin-graphql-api-utilities';
import { APIGatewayProxyResult } from 'aws-lambda';
import { PoolClient } from 'pg';
import { mutateAndValidateGraphQLData } from './util';
import { DELETE_PRODUCT_MUTATION } from './graphql';
import { initializePool } from './db';
import { ShopifyEvent } from './types';

type RetailerProductDetailRow = {
    retailerShopifyProductId: string;
    retailerShop: string;
    retailerAccessToken: string;
};

async function isRetailerProduct(shopifyDeletedProductId: string, client: PoolClient) {
    try {
        const productQuery = `SELECT FROM "ImportedProduct" WHERE "shopifyProductId" = $1 LIMIT 1`;
        const res = await client.query(productQuery, [shopifyDeletedProductId]);
        if (res.rows.length > 0) {
            return true;
        }
        return false;
    } catch (error) {
        console.error(error);
        throw new Error(`Failed to check if productId ${shopifyDeletedProductId} is a retailer product.`);
    }
}

async function isSupplierProduct(shopifyDeletedProductId: string, client: PoolClient) {
    try {
        const productQuery = `SELECT FROM "Product" WHERE "shopifyProductId" = $1 LIMIT 1`;
        const res = await client.query(productQuery, [shopifyDeletedProductId]);
        if (res.rows.length > 0) {
            return true;
        }
        return false;
    } catch (error) {
        console.error(error);
        throw new Error(`Failed to check if productId ${shopifyDeletedProductId} is a supplier product.`);
    }
}

async function handleDeletedSupplierProduct(shopifyDeletedProductId: string, client: PoolClient) {
    // removes all retailer imported products and cleans database
    try {
        const allRetailerImportedProductsQuery = `
            SELECT 
                "ImportedProduct"."shopifyProductId" AS "retailerShopifyProductId", 
                "Session"."shop" AS "retailerShop", 
                "Session"."accessToken" AS "retailerAccessToken"
            FROM "Product"
            INNER JOIN "ImportedProduct" ON "Product"."id" = "ImportedProduct"."prismaProductId"
            INNER JOIN "Session" ON "ImportedProduct"."retailerId" = "Session"."id"
            WHERE "Product"."shopifyProductId" = $1
        `;
        const res = await client.query(allRetailerImportedProductsQuery, [shopifyDeletedProductId]);
        const rows = res.rows as RetailerProductDetailRow[];
        const deleteRetailerImportedProductPromises = rows.map(
            ({ retailerShopifyProductId, retailerShop, retailerAccessToken }) => {
                return mutateAndValidateGraphQLData(
                    retailerShop,
                    retailerAccessToken,
                    DELETE_PRODUCT_MUTATION,
                    {
                        id: retailerShopifyProductId,
                    },
                    'Could not delete product for retailer.',
                );
            },
        );
        await Promise.all(deleteRetailerImportedProductPromises);
        const deleteSupplierProductMutation = `DELETE FROM "Product" WHERE "shopifyProductId" = $1`;
        await client.query(deleteSupplierProductMutation, [shopifyDeletedProductId]);
    } catch (error) {
        console.error(error);
        throw new Error('Failed to handle supplier product deletion');
    }
}

// if this is the case, we just need to delete it from the database
async function handleDeletedRetailerProduct(shopifyDeletedProductId: string, client: PoolClient) {
    try {
        const query = `DELETE FROM "ImportedProduct" WHERE "shopifyProductId" = $1`;
        await client.query(query, [shopifyDeletedProductId]);
    } catch (error) {
        console.error(error);
        throw new Error('Failed to delete imported product from database.');
    }
}

export const lambdaHandler = async (event: ShopifyEvent): Promise<APIGatewayProxyResult> => {
    let client: null | PoolClient = null;
    try {
        const pool = await initializePool();
        const {
            detail: { payload },
        } = event;
        const { id } = payload;
        const shopifyDeletedProductId = composeGid('Product', id);
        client = await pool.connect();
        const [isRetailerProductRes, isSupplierProductRes] = await Promise.all([
            isRetailerProduct(shopifyDeletedProductId, client),
            isSupplierProduct(shopifyDeletedProductId, client),
        ]);

        if (!isRetailerProductRes && !isSupplierProductRes) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: 'There were no products to delete.',
                }),
            };
        } else if (isSupplierProductRes) {
            await handleDeletedSupplierProduct(shopifyDeletedProductId, client);
        } else if (isRetailerProductRes) {
            await handleDeletedRetailerProduct(shopifyDeletedProductId, client);
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Successfully deleted products from database.',
            }),
        };
    } catch (error) {
        console.error((error as Error).message);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Could not delete products.',
                error: (error as Error).message,
            }),
        };
    } finally {
        if (client) {
            client.release();
        }
    }
};
