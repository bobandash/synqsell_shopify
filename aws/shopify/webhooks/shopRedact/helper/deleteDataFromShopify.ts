import { PoolClient } from 'pg';
import { Session } from '../types';
import { ROLES, RolesOptions } from '../constants';
import { mutateAndValidateGraphQLData } from '../util';
import { DELETE_PRODUCT_MUTATION } from '../graphql';
import { ProductDeleteMutation } from '../types/admin.generated';

type RetailerImportedProductDetail = {
    retailerShopifyProductId: string;
    retailerId: string;
};

// ==============================================================================================================
// START: GENERIC HELPER FUNCTIONS
// ==============================================================================================================

async function getSession(sessionId: string, client: PoolClient) {
    try {
        const query = `SELECT * FROM "Session" WHERE id = $1 LIMIT 1`;
        const sessionData = await client.query(query, [sessionId]);
        if (sessionData.rows.length === 0) {
            throw new Error('Shop data is invalid.');
        }
        const session = sessionData.rows[0];
        return session as Session;
    } catch (error) {
        console.error(error);
        throw new Error(`Failed to retrieve session from sessionId ${sessionId}.`);
    }
}

async function isRole(sessionId: string, role: RolesOptions, client: PoolClient) {
    try {
        const query = `
            SELECT * FROM "Role"
            WHERE "name" = $1 AND "sessionId" = $2
            LIMIT 1
        `;
        const res = await client.query(query, [role, sessionId]);
        return res.rows.length > 0;
    } catch (error) {
        console.error(error);
        throw new Error(`Failed to check if session id ${sessionId} is a supplier.`);
    }
}

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
    try {
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
    } catch (error) {
        console.error(error);
        throw new Error(`Failed to get all retailer imported product details from supplier ${supplierId}`);
    }
}

async function deleteAllImportedProductsShopify(supplierSession: Session, client: PoolClient) {
    try {
        const retailerImportedProductDetails = await getAllRetailerImportedProductDetails(supplierSession.id, client);
        const retailerToShopifyProductIds = groupByRetailer(retailerImportedProductDetails);
        const retailerIds = Array.from(retailerToShopifyProductIds.keys());
        await Promise.all(
            retailerIds.map(async (retailerId) => {
                const retailerShopifyProductIds = retailerToShopifyProductIds.get(retailerId);
                const retailerSession = await getSession(retailerId, client);
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
    } catch (error) {
        console.error(error);
        throw new Error("Failed to delete all of retailers' imported products on Shopify.");
    }
}

// ==============================================================================================================
// END: HELPER FUNCTIONS FOR DELETING ALL RETAILER IMPORTED PRODUCTS FROM SUPPLIER
// ==============================================================================================================

async function deleteDataFromShopify(session: Session, client: PoolClient) {
    try {
        // There may be other impl in the future when user is a retailer, so I'll put the supplier check here
        const isSupplier = await isRole(session.id, ROLES.SUPPLIER, client);
        if (isSupplier) {
            await deleteAllImportedProductsShopify(session, client);
        }
    } catch (error) {
        console.error(error);
        throw new Error(`Failed to delete data from shopify for session ${session.id}`);
    }
}

export default deleteDataFromShopify;
