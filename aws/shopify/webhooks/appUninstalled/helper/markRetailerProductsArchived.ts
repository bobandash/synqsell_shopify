import { PoolClient } from 'pg';
import { mutateAndValidateGraphQLData } from '/opt/nodejs/utils';
import { UpdateProductStatusMutation } from '../types/admin.generated';
import { UPDATE_PRODUCT_STATUS_MUTATION } from '../graphql';
import { getSessionFromId } from '/opt/nodejs/models/session';

type RetailerImportedProductDetail = {
    retailerShopifyProductId: string;
    retailerId: string;
};

// ==============================================================================================================
// START: HELPER FUNCTIONS FOR MARKING RETAILER IMPORTED PRODUCTS FROM SUPPLIER AS INACTIVE
// ==============================================================================================================
function groupByRetailer(retailerImportedProductDetails: RetailerImportedProductDetail[]) {
    const retailerToShopifyProductId = new Map<string, string[]>(); // retailer Id to retailer shopify product id
    retailerImportedProductDetails.forEach(({ retailerId, retailerShopifyProductId }) => {
        const prev = retailerToShopifyProductId.get(retailerId);
        if (prev) {
            retailerToShopifyProductId.set(retailerId, [...prev, retailerShopifyProductId]);
        } else {
            retailerToShopifyProductId.set(retailerId, [retailerShopifyProductId]);
        }
    });
    return retailerToShopifyProductId;
}

async function getAllRetailerImportedProductDetails(supplierId: string, client: PoolClient) {
    // retrieves all imported product ids from products listed by supplier
    const query = `
        SELECT 
        "ImportedProduct"."shopifyProductId" AS "retailerShopifyProductId",
        "ImportedProduct"."retailerId"
        FROM "ImportedProduct"
        INNER JOIN "Product" ON "ImportedProduct"."prismaProductId" = "Product"."id"
        INNER JOIN "PriceList" ON "PriceList"."id" = "Product"."priceListId"
        WHERE "PriceList"."supplierId" = $1
    `;
    const res = await client.query(query, [supplierId]);
    const data: RetailerImportedProductDetail[] = res.rows;
    return data;
}

// ==============================================================================================================
// END: HELPER FUNCTIONS FOR MARKING RETAILER IMPORTED PRODUCTS FROM SUPPLIER AS INACTIVE
// ==============================================================================================================
async function markRetailerProductsArchived(supplierId: string, client: PoolClient) {
    const retailerImportedProductDetails = await getAllRetailerImportedProductDetails(supplierId, client);
    const retailerToShopifyProductIds = groupByRetailer(retailerImportedProductDetails);
    const retailerIds = Array.from(retailerToShopifyProductIds.keys());
    await Promise.all(
        retailerIds.map(async (retailerId) => {
            const retailerShopifyProductIds = retailerToShopifyProductIds.get(retailerId);
            const retailerSession = await getSessionFromId(retailerId, client);
            if (!retailerShopifyProductIds) {
                return Promise.resolve();
            }
            return Promise.all(
                retailerShopifyProductIds.map((shopifyProductId) =>
                    mutateAndValidateGraphQLData<UpdateProductStatusMutation>(
                        retailerSession.shop,
                        retailerSession.accessToken,
                        UPDATE_PRODUCT_STATUS_MUTATION,
                        {
                            input: {
                                id: shopifyProductId,
                                status: 'ARCHIVED',
                            },
                        },
                        'Failed to update product status.',
                    ),
                ),
            );
        }),
    );
}

export default markRetailerProductsArchived;
