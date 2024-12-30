import { simpleFaker } from '@faker-js/faker/.';
import { exportsForTesting } from '../../markRetailerProductsArchived';
import { DatabaseSetup, disconnectClient, setupDatabase, teardownPool } from '~/test-db-setup';
import { createTestOrderWithEntireFlow, type TestOrderEntireFlow } from '@db/factories/order.factories';
import { generateImportedProduct, generateProduct } from '@db/factories/pricelist.factories';
if (!exportsForTesting) {
    throw new Error('Environment is not tests.');
}

const { getAllRetailerImportedProductDetails, markRetailerProductsArchived } = exportsForTesting;

describe('markRetailerProductsArchived', () => {
    let orderEntireFlowDetails: TestOrderEntireFlow;
    let database: DatabaseSetup;
    const nonExistentId = simpleFaker.string.uuid();
    beforeEach(async () => {
        database = await setupDatabase();
        orderEntireFlowDetails = await createTestOrderWithEntireFlow();
    });

    afterEach(() => {
        disconnectClient(database.client);
    });

    afterAll(async () => {
        teardownPool(database.pool);
    });

    describe('getAllRetailerImportedProductDetails', () => {
        it('should return imported product details', async () => {
            const { supplier, importedProduct } = orderEntireFlowDetails;
            const { client } = database;
            const res = await getAllRetailerImportedProductDetails(supplier.id, client);
            const details = [
                {
                    retailerShopifyProductId: importedProduct.shopifyProductId,
                    retailerId: importedProduct.retailerId,
                },
            ];
            expect(res).toHaveLength(1);
            expect(res).toEqual(details);
        });

        it('should return multiple imported product details', async () => {
            const { supplier, importedProduct, priceList, retailer } = orderEntireFlowDetails;
            const { client } = database;
            const newProduct = await generateProduct(priceList.id);
            const newImportedProduct = await generateImportedProduct(newProduct.id, retailer.id);

            const res = await getAllRetailerImportedProductDetails(supplier.id, client);
            const details = [
                {
                    retailerShopifyProductId: importedProduct.shopifyProductId,
                    retailerId: importedProduct.retailerId,
                },
                {
                    retailerShopifyProductId: newImportedProduct.shopifyProductId,
                    retailerId: newImportedProduct.retailerId,
                },
            ];
            expect(res).toHaveLength(2);
            expect(res).toEqual(details);
        });

        it('should return empty array if invalid retailerId', async () => {
            const { client } = database;
            const res = await getAllRetailerImportedProductDetails(nonExistentId, client);
            expect(res).toHaveLength(0);
        });
    });
});

// async function getAllRetailerImportedProductDetails(supplierId: string, client: PoolClient) {
//     // retrieves all imported product ids from products listed by supplier
//     const query = `
//         SELECT
//         "ImportedProduct"."shopifyProductId" AS "retailerShopifyProductId",
//         "ImportedProduct"."retailerId"
//         FROM "ImportedProduct"
//         INNER JOIN "Product" ON "ImportedProduct"."prismaProductId" = "Product"."id"
//         INNER JOIN "PriceList" ON "PriceList"."id" = "Product"."priceListId"
//         WHERE "PriceList"."supplierId" = $1
//     `;
//     const res = await client.query(query, [supplierId]);
//     const data: RetailerImportedProductDetail[] = res.rows;
//     return data;
// }

// // ==============================================================================================================
// // END: HELPER FUNCTIONS FOR MARKING RETAILER IMPORTED PRODUCTS FROM SUPPLIER AS INACTIVE
// // ==============================================================================================================
// async function markRetailerProductsArchived(supplierId: string, client: PoolClient) {
//     const retailerImportedProductDetails = await getAllRetailerImportedProductDetails(supplierId, client);
//     const retailerToShopifyProductIds = groupByRetailer(retailerImportedProductDetails);
//     const retailerIds = Array.from(retailerToShopifyProductIds.keys());
//     await Promise.all(
//         retailerIds.map(async (retailerId) => {
//             const retailerShopifyProductIds = retailerToShopifyProductIds.get(retailerId);
//             const retailerSession = await getSessionFromId(retailerId, client);
//             if (!retailerShopifyProductIds) {
//                 return Promise.resolve();
//             }
//             return Promise.all(
//                 retailerShopifyProductIds.map((shopifyProductId) =>
//                     mutateAndValidateGraphQLData<UpdateProductStatusMutation>(
//                         retailerSession.shop,
//                         retailerSession.accessToken,
//                         UPDATE_PRODUCT_STATUS_MUTATION,
//                         {
//                             input: {
//                                 id: shopifyProductId,
//                                 status: 'ARCHIVED',
//                             },
//                         },
//                         'Failed to update product status.',
//                     ),
//                 ),
//             );
//         }),
//     );
// }

// export default markRetailerProductsArchived;
// export const exportsForTesting =
//     process.env.NODE_ENV === 'test'
//         ? { groupByRetailer, getAllRetailerImportedProductDetails, markRetailerProductsArchived }
//         : undefined;
