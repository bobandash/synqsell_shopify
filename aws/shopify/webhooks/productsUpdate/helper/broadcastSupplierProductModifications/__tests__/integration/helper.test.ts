import { DatabaseSetup, disconnectClient, setupDatabase, teardownPool } from '~/test-db-setup';
import { createTestOrderWithEntireFlow, TestOrderEntireFlow } from '@db/factories/order.factories';
import { simpleFaker } from '@faker-js/faker/.';
import { exportsForTesting } from '../../helper';
import {
    createEntireVariantWithImportedEntities,
    createNewRetailerWithImportedProduct,
    generatePriceList,
    generateProduct,
    generateVariant,
} from '@db/factories/pricelist.factories';
import { PRICE_LIST_PRICING_STRATEGY } from '@db/constants';
import { generateRandomPricesForVariant, generateRandomRetailPrice } from '@db/fixtures';
import db from '@db/test-db';
import { createEditedVariant } from '../utils';
import { GroupedQueryDataWithUpdateFields } from '~/shopify/webhooks/productsUpdate/types';
import { updateInventoryShopify, updateProductStatusShopify, updateVariantShopify } from '../../../util';
import { PRODUCT_STATUS } from '~/util-layer/constants';

if (!exportsForTesting) {
    throw new Error('Environment is not tests.');
}

jest.mock('/opt/nodejs/utils', () => ({
    ...jest.requireActual('/opt/nodejs/utils'),
    mutateAndValidateGraphQLData: jest.fn(),
    fetchAndValidateGraphQLData: jest.fn(),
}));

jest.mock('../../../util', () => ({
    ...jest.requireActual('../../../util'),
    updateVariantShopify: jest.fn(),
    updateProductStatusShopify: jest.fn(),
    getProductStatusShopify: jest.fn(),
    updateInventoryShopify: jest.fn(),
    getVariantDataShopify: jest.fn(),
}));

const {
    getAllPriceLists,
    updateVariantPriceDb,
    updateAllVariantsPricingDb,
    getPriceListForImportedProduct,
    updateRetailerVariantPricesShopify,
    updateRetailerVariantInventoriesShopify,
    updateRetailerProductStatusShopify,
} = exportsForTesting;

describe('broadcastSupplierProductModifications', () => {
    let orderEntireFlowDetails: TestOrderEntireFlow;
    let database: DatabaseSetup;
    const nonExistentId = simpleFaker.string.uuid();
    beforeEach(async () => {
        jest.clearAllMocks();
        database = await setupDatabase();
        orderEntireFlowDetails = await createTestOrderWithEntireFlow();
    });

    afterEach(() => {
        disconnectClient(database.client);
    });

    afterAll(async () => {
        await teardownPool(database.pool);
    });

    describe('getAllPriceLists', () => {
        it('should throw error if no price list exists for product', async () => {
            const { client } = database;
            await expect(getAllPriceLists(nonExistentId, client)).rejects.toThrow();
        });

        it('should return price lists the product is in', async () => {
            const { product, priceList } = orderEntireFlowDetails;
            const { client } = database;
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { createdAt, ...rest } = priceList;
            const res = await getAllPriceLists(product.shopifyProductId, client);
            expect(res).toHaveLength(1);
            expect(res[0]).toMatchObject(rest);
        });

        it('should return multiple price lists if product is in multiple price lists', async () => {
            const { product, supplier } = orderEntireFlowDetails;
            const { client } = database;
            const newPriceList = await generatePriceList(supplier.id, false, PRICE_LIST_PRICING_STRATEGY.WHOLESALE);
            await generateProduct(newPriceList.id, {
                shopifyProductId: product.shopifyProductId,
            });
            const res = await getAllPriceLists(product.shopifyProductId, client);
            expect(res).toHaveLength(2);
        });
    });

    describe('updateVariantPriceDb', () => {
        it('should update variant price information', async () => {
            const { client } = database;
            const { priceList, variant } = orderEntireFlowDetails;
            const { retailPrice, retailerPayment, supplierProfit } = generateRandomPricesForVariant();
            const newPricing = {
                retailPrice,
                retailerPayment,
                supplierProfit,
            };
            const newPricingWithIdentifiers = {
                ...newPricing,
                shopifyVariantId: variant.shopifyVariantId,
                priceListId: priceList.id,
            };
            await updateVariantPriceDb(newPricingWithIdentifiers, client);
            const variantQuery = await db.variant.findFirstOrThrow({
                where: {
                    id: variant.id,
                },
            });
            expect(variantQuery).toMatchObject(newPricing);
        });
    });

    describe('updateAllVariantsPricingDb', () => {
        it('should update multiple variant price information', async () => {
            const { client } = database;
            const { variant, product } = orderEntireFlowDetails;
            const newVariant = await generateVariant(product.id);
            const editedVariants = [
                createEditedVariant(variant.shopifyVariantId, 10, generateRandomRetailPrice()),
                createEditedVariant(newVariant.shopifyVariantId, 10, generateRandomRetailPrice()),
            ];
            await updateAllVariantsPricingDb(editedVariants, product.shopifyProductId, client);
            const variantOneQuery = await db.variant.findFirstOrThrow({
                where: {
                    id: variant.id,
                },
            });
            const variantTwoQuery = await db.variant.findFirstOrThrow({
                where: {
                    id: newVariant.id,
                },
            });
            expect(variantOneQuery.retailPrice).toBe(editedVariants[0].price);
            expect(variantTwoQuery.retailPrice).toBe(editedVariants[1].price);
        });
    });

    describe('getPriceListForImportedProduct', () => {
        it('should return the price list the imported product is in', async () => {
            const { importedProduct, priceList } = orderEntireFlowDetails;
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { createdAt, ...rest } = priceList;
            const { client } = database;
            const res = await getPriceListForImportedProduct(importedProduct.shopifyProductId, client);
            expect(res).toMatchObject(rest);
        });

        it('should throw error if imported product does not exist', async () => {
            const { client } = database;
            await expect(getPriceListForImportedProduct(nonExistentId, client)).rejects.toThrow();
        });
    });

    describe('updateRetailerVariantPricesShopify', () => {
        it('should update variant in product with new price and cost with correct parameters', async () => {
            const { client } = database;
            const {
                product,
                importedProduct,
                importedVariant,
                importedInventoryItem,
                retailer,
                retailerFulfillmentService,
            } = orderEntireFlowDetails;
            const data = new Map() as GroupedQueryDataWithUpdateFields;
            data.set(importedProduct.shopifyProductId, {
                retailerAccessToken: retailer.accessToken,
                retailerShop: retailer.shop,
                retailerShopifyLocationId: retailerFulfillmentService.shopifyLocationId,
                variants: [
                    {
                        retailerShopifyVariantId: importedVariant.shopifyVariantId,
                        retailPrice: '24.99',
                        inventory: 10,
                        retailerShopifyInventoryItemId: importedInventoryItem.shopifyInventoryItemId,
                    },
                ],
            });
            await updateRetailerVariantPricesShopify(data, product.shopifyProductId, client);
            expect(updateVariantShopify).toHaveBeenCalledTimes(1);
            expect(updateVariantShopify).toHaveBeenCalledWith(
                { shop: retailer.shop, accessToken: retailer.accessToken },
                importedProduct.shopifyProductId,
                [
                    {
                        id: importedVariant.shopifyVariantId,
                        price: '24.99',
                        inventoryItem: {
                            cost: expect.any(String),
                        },
                    },
                ],
            );
        });

        it('should update multiple variants in product with new price and cost with correct parameters', async () => {
            const { client } = database;
            const {
                product,
                importedProduct,
                importedVariant,
                importedInventoryItem,
                retailer,
                retailerFulfillmentService,
            } = orderEntireFlowDetails;
            const newVariantAndImportedVariant = await createEntireVariantWithImportedEntities(
                product.id,
                importedProduct.id,
            );
            const data = new Map() as GroupedQueryDataWithUpdateFields;
            data.set(importedProduct.shopifyProductId, {
                retailerAccessToken: retailer.accessToken,
                retailerShop: retailer.shop,
                retailerShopifyLocationId: retailerFulfillmentService.shopifyLocationId,
                variants: [
                    {
                        retailerShopifyVariantId: importedVariant.shopifyVariantId,
                        retailPrice: '24.99',
                        inventory: 10,
                        retailerShopifyInventoryItemId: importedInventoryItem.shopifyInventoryItemId,
                    },
                    {
                        retailerShopifyVariantId: newVariantAndImportedVariant.importedVariant.shopifyVariantId,
                        retailPrice: '24.99',
                        inventory: 10,
                        retailerShopifyInventoryItemId:
                            newVariantAndImportedVariant.importedInventoryItem.shopifyInventoryItemId,
                    },
                ],
            });
            await updateRetailerVariantPricesShopify(data, product.shopifyProductId, client);
            expect(updateVariantShopify).toHaveBeenCalledTimes(1);
            expect(updateVariantShopify).toHaveBeenCalledWith(
                { shop: retailer.shop, accessToken: retailer.accessToken },
                importedProduct.shopifyProductId,
                expect.arrayContaining([
                    {
                        id: importedVariant.shopifyVariantId,
                        price: '24.99',
                        inventoryItem: {
                            cost: expect.any(String),
                        },
                    },
                    {
                        id: newVariantAndImportedVariant.importedVariant.shopifyVariantId,
                        price: '24.99',
                        inventoryItem: {
                            cost: expect.any(String),
                        },
                    },
                ]),
            );
        });

        it(`should update new price and cost for multiple retailers`, async () => {
            const { client } = database;
            const {
                product,
                variant,
                inventoryItem,
                importedVariant,
                importedInventoryItem,
                importedProduct,
                retailer,
                retailerFulfillmentService,
            } = orderEntireFlowDetails;
            const res = await createNewRetailerWithImportedProduct(
                product.id,
                variant.id,
                inventoryItem.id,
                retailer.id,
            );
            const data = new Map() as GroupedQueryDataWithUpdateFields;
            data.set(importedProduct.shopifyProductId, {
                retailerAccessToken: retailer.accessToken,
                retailerShop: retailer.shop,
                retailerShopifyLocationId: retailerFulfillmentService.shopifyLocationId,
                variants: [
                    {
                        retailerShopifyVariantId: importedVariant.shopifyVariantId,
                        retailPrice: '24.99',
                        inventory: 10,
                        retailerShopifyInventoryItemId: importedInventoryItem.shopifyInventoryItemId,
                    },
                ],
            });
            data.set(res.importedProduct.shopifyProductId, {
                retailerAccessToken: res.retailer.accessToken,
                retailerShop: res.retailer.shop,
                retailerShopifyLocationId: res.fulfillmentService.shopifyLocationId,
                variants: [
                    {
                        retailerShopifyVariantId: res.importedVariant.shopifyVariantId,
                        retailPrice: '24.99',
                        inventory: 10,
                        retailerShopifyInventoryItemId: res.importedInventoryItem.shopifyInventoryItemId,
                    },
                ],
            });
            await updateRetailerVariantPricesShopify(data, product.shopifyProductId, client);
            expect(updateVariantShopify).toHaveBeenCalledTimes(2);
        });
    });

    describe('updateRetailerVariantInventoriesShopify', () => {
        it('should update variant in product with new inventory with correct parameters', async () => {
            const { importedProduct, importedVariant, importedInventoryItem, retailer, retailerFulfillmentService } =
                orderEntireFlowDetails;
            const data = new Map() as GroupedQueryDataWithUpdateFields;
            data.set(importedProduct.shopifyProductId, {
                retailerAccessToken: retailer.accessToken,
                retailerShop: retailer.shop,
                retailerShopifyLocationId: retailerFulfillmentService.shopifyLocationId,
                variants: [
                    {
                        retailerShopifyVariantId: importedVariant.shopifyVariantId,
                        retailPrice: '24.99',
                        inventory: 10,
                        retailerShopifyInventoryItemId: importedInventoryItem.shopifyInventoryItemId,
                    },
                ],
            });
            await updateRetailerVariantInventoriesShopify(data);
            expect(updateInventoryShopify).toHaveBeenCalledTimes(1);
            expect(updateInventoryShopify).toHaveBeenCalledWith(
                { shop: retailer.shop, accessToken: retailer.accessToken },
                importedInventoryItem.shopifyInventoryItemId,
                retailerFulfillmentService.shopifyLocationId,
                10,
            );
        });

        it('should update multiple variants in product with new inventory', async () => {
            const {
                product,
                importedProduct,
                importedVariant,
                importedInventoryItem,
                retailer,
                retailerFulfillmentService,
            } = orderEntireFlowDetails;
            const newVariantAndImportedVariant = await createEntireVariantWithImportedEntities(
                product.id,
                importedProduct.id,
            );
            const data = new Map() as GroupedQueryDataWithUpdateFields;
            data.set(importedProduct.shopifyProductId, {
                retailerAccessToken: retailer.accessToken,
                retailerShop: retailer.shop,
                retailerShopifyLocationId: retailerFulfillmentService.shopifyLocationId,
                variants: [
                    {
                        retailerShopifyVariantId: importedVariant.shopifyVariantId,
                        retailPrice: '24.99',
                        inventory: 10,
                        retailerShopifyInventoryItemId: importedInventoryItem.shopifyInventoryItemId,
                    },
                    {
                        retailerShopifyVariantId: newVariantAndImportedVariant.importedVariant.shopifyVariantId,
                        retailPrice: '24.99',
                        inventory: 10,
                        retailerShopifyInventoryItemId:
                            newVariantAndImportedVariant.importedInventoryItem.shopifyInventoryItemId,
                    },
                ],
            });
            await updateRetailerVariantInventoriesShopify(data);
            expect(updateInventoryShopify).toHaveBeenCalledTimes(2);
        });

        it(`should update new price and cost for multiple retailers`, async () => {
            const {
                product,
                variant,
                inventoryItem,
                importedVariant,
                importedInventoryItem,
                importedProduct,
                retailer,
                retailerFulfillmentService,
            } = orderEntireFlowDetails;
            const res = await createNewRetailerWithImportedProduct(
                product.id,
                variant.id,
                inventoryItem.id,
                retailer.id,
            );
            const data = new Map() as GroupedQueryDataWithUpdateFields;
            data.set(importedProduct.shopifyProductId, {
                retailerAccessToken: retailer.accessToken,
                retailerShop: retailer.shop,
                retailerShopifyLocationId: retailerFulfillmentService.shopifyLocationId,
                variants: [
                    {
                        retailerShopifyVariantId: importedVariant.shopifyVariantId,
                        retailPrice: '24.99',
                        inventory: 10,
                        retailerShopifyInventoryItemId: importedInventoryItem.shopifyInventoryItemId,
                    },
                ],
            });
            data.set(res.importedProduct.shopifyProductId, {
                retailerAccessToken: res.retailer.accessToken,
                retailerShop: res.retailer.shop,
                retailerShopifyLocationId: res.fulfillmentService.shopifyLocationId,
                variants: [
                    {
                        retailerShopifyVariantId: res.importedVariant.shopifyVariantId,
                        retailPrice: '24.99',
                        inventory: 10,
                        retailerShopifyInventoryItemId: res.importedInventoryItem.shopifyInventoryItemId,
                    },
                ],
            });
            await updateRetailerVariantInventoriesShopify(data);
            expect(updateInventoryShopify).toHaveBeenCalledTimes(2);
        });
    });

    describe('updateRetailerProductStatusShopify', () => {
        it(`should update retailer's product with new product status`, async () => {
            const { importedProduct, importedVariant, importedInventoryItem, retailer, retailerFulfillmentService } =
                orderEntireFlowDetails;
            const data = new Map() as GroupedQueryDataWithUpdateFields;
            const newProductStatus = PRODUCT_STATUS.ARCHIVED;
            data.set(importedProduct.shopifyProductId, {
                retailerAccessToken: retailer.accessToken,
                retailerShop: retailer.shop,
                retailerShopifyLocationId: retailerFulfillmentService.shopifyLocationId,
                variants: [
                    {
                        retailerShopifyVariantId: importedVariant.shopifyVariantId,
                        retailPrice: '24.99',
                        inventory: 10,
                        retailerShopifyInventoryItemId: importedInventoryItem.shopifyInventoryItemId,
                    },
                ],
            });
            await updateRetailerProductStatusShopify(data, newProductStatus);
            expect(updateProductStatusShopify).toHaveBeenCalledTimes(1);
            expect(updateProductStatusShopify).toHaveBeenCalledWith(
                { shop: retailer.shop, accessToken: retailer.accessToken },
                importedProduct.shopifyProductId,
                newProductStatus,
            );
        });

        it(`should update multiple retailer's product with new product status`, async () => {
            const {
                product,
                variant,
                inventoryItem,
                importedVariant,
                importedInventoryItem,
                importedProduct,
                retailer,
                retailerFulfillmentService,
            } = orderEntireFlowDetails;
            const res = await createNewRetailerWithImportedProduct(
                product.id,
                variant.id,
                inventoryItem.id,
                retailer.id,
            );
            const newProductStatus = PRODUCT_STATUS.ARCHIVED;
            const data = new Map() as GroupedQueryDataWithUpdateFields;
            data.set(importedProduct.shopifyProductId, {
                retailerAccessToken: retailer.accessToken,
                retailerShop: retailer.shop,
                retailerShopifyLocationId: retailerFulfillmentService.shopifyLocationId,
                variants: [
                    {
                        retailerShopifyVariantId: importedVariant.shopifyVariantId,
                        retailPrice: '24.99',
                        inventory: 10,
                        retailerShopifyInventoryItemId: importedInventoryItem.shopifyInventoryItemId,
                    },
                ],
            });
            data.set(res.importedProduct.shopifyProductId, {
                retailerAccessToken: res.retailer.accessToken,
                retailerShop: res.retailer.shop,
                retailerShopifyLocationId: res.fulfillmentService.shopifyLocationId,
                variants: [
                    {
                        retailerShopifyVariantId: res.importedVariant.shopifyVariantId,
                        retailPrice: '24.99',
                        inventory: 10,
                        retailerShopifyInventoryItemId: res.importedInventoryItem.shopifyInventoryItemId,
                    },
                ],
            });
            await updateRetailerProductStatusShopify(data, newProductStatus);
            expect(updateProductStatusShopify).toHaveBeenCalledTimes(2);
        });
    });
});
