import { PoolClient } from 'pg';
import { mutateAndValidateGraphQLData } from '/opt/nodejs/utils';
import { DELETE_PRODUCT_MUTATION } from '../graphql';
import { deleteProduct } from '/opt/nodejs/models/product';

type RetailerProductDetailRow = {
    retailerShopifyProductId: string;
    retailerShop: string;
    retailerAccessToken: string;
};

async function deleteImportedProductsShopify(shopifyProductId: string, client: PoolClient) {
    const allRetailerProductsQuery = `
        SELECT 
            "ImportedProduct"."shopifyProductId" AS "retailerShopifyProductId", 
            "Session"."shop" AS "retailerShop", 
            "Session"."accessToken" AS "retailerAccessToken"
        FROM "Product"
        INNER JOIN "ImportedProduct" ON "Product"."id" = "ImportedProduct"."prismaProductId"
        INNER JOIN "Session" ON "ImportedProduct"."retailerId" = "Session"."id"
        WHERE "Product"."shopifyProductId" = $1
    `;
    const res = await client.query(allRetailerProductsQuery, [shopifyProductId]);
    const rows = res.rows as RetailerProductDetailRow[];
    const deleteRetailerProductsOnShopifyPromises = rows.map(
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
    await Promise.all(deleteRetailerProductsOnShopifyPromises);
}

async function handleDeletedSupplierProduct(shopifyProductId: string, client: PoolClient) {
    await deleteImportedProductsShopify(shopifyProductId, client);
    await deleteProduct(shopifyProductId, client);
}

export default handleDeletedSupplierProduct;
