import { PoolClient } from 'pg';
import { Session } from '../types';
import { DELETE_PRODUCT_MUTATION } from '../graphql';
import { ProductDeleteMutation } from '../types/admin.generated';
import { getSessionFromId } from '/opt/nodejs/models/session';
import { mutateAndValidateGraphQLData } from '/opt/nodejs/utils';
import { ROLES } from '/opt/nodejs/constants';
import { hasRole } from '/opt/nodejs/models/role';

type RetailerImportedProductDetail = {
    retailerShopifyProductId: string;
    retailerId: string;
};

// ==============================================================================================================
// START: HELPER FUNCTIONS FOR DELETING ALL RETAILER IMPORTED PRODUCTS FROM SUPPLIER
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

async function deleteAllImportedProductsShopify(supplierSession: Session, client: PoolClient) {
    const retailerImportedProductDetails = await getAllRetailerImportedProductDetails(supplierSession.id, client);
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
                    mutateAndValidateGraphQLData<ProductDeleteMutation>(
                        retailerSession.shop,
                        retailerSession.accessToken,
                        DELETE_PRODUCT_MUTATION,
                        {
                            id: shopifyProductId,
                        },
                        `Failed to delete product ${shopifyProductId} for retailer ${retailerId}.`,
                    ),
                ),
            );
        }),
    );
}

// ==============================================================================================================
// END: HELPER FUNCTIONS FOR DELETING ALL RETAILER IMPORTED PRODUCTS FROM SUPPLIER
// ==============================================================================================================

async function deleteDataFromShopify(session: Session, client: PoolClient) {
    // There may be other impl in the future when user is a retailer, so I'll put the supplier check here
    const isSupplier = await hasRole(session.id, ROLES.SUPPLIER, client);
    if (isSupplier) {
        await deleteAllImportedProductsShopify(session, client);
    }
}

export default deleteDataFromShopify;
