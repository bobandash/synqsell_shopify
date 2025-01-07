import { createTestOrderWithEntireFlow, TestOrderEntireFlow } from '@db/factories/order.factories';
import initializePool, { pool } from '@db/test-pool';
import { ShopifyEvent } from '../../types';
import db from '@db/test-db';
import { createTestSession } from '@db/factories/session.factories';
import { generateBilling } from '@db/factories/billing.factories';
import { simpleFaker } from '@faker-js/faker/.';
import * as importedProductModels from '/opt/nodejs/models/importedProduct';
import { generateRole } from '@db/factories/role.factories';
import { ROLES } from '@db/constants';
import { lambdaHandler } from '../../app';
import { broadcastSupplierProductModifications, revertRetailerProductModifications } from '../../helper';

type VariantEvent = {
    admin_graphql_api_id: string;
    inventory_quantity: number;
    old_inventory_quantity: number;
    price: string;
};
jest.mock('../../db.ts', () => ({
    initializePool: initializePool,
}));

jest.mock('../../helper', () => ({
    broadcastSupplierProductModifications: jest.fn(),
    revertRetailerProductModifications: jest.fn(),
}));

describe('Products Update Shopify Webhook', () => {
    let orderEntireFlowDetails: TestOrderEntireFlow;
    const nonExistentId = simpleFaker.string.uuid();
    const createVariantDetails = (
        shopifyVariantId: string,
        inventoryQty: number,
        oldInventoryQty: number,
        price: string,
    ): VariantEvent => ({
        admin_graphql_api_id: shopifyVariantId,
        inventory_quantity: inventoryQty,
        old_inventory_quantity: oldInventoryQty,
        price: price,
    });

    const createEvent = (
        shop: string,
        shopifyProductId: string,
        status: string,
        variants: VariantEvent[],
    ): ShopifyEvent =>
        ({
            detail: {
                metadata: {
                    'X-Shopify-Shop-Domain': shop,
                    'X-Shopify-Webhook-Id': simpleFaker.string.uuid(),
                },
                payload: {
                    admin_graphql_api_id: shopifyProductId,
                    variants,
                    status,
                },
            },
        } as unknown as ShopifyEvent);

    beforeEach(async () => {
        jest.clearAllMocks();
        orderEntireFlowDetails = await createTestOrderWithEntireFlow();
    });

    afterAll(async () => {
        if (pool) {
            await pool.end();
        }
    });

    it('should call broadcastSupplierProductModifications w/ correct params if the product is a supplier product', async () => {
        const { product, variant, supplier } = orderEntireFlowDetails;
        const variantDetails = createVariantDetails(variant.shopifyVariantId, 10, 10, '19.99');
        const event = createEvent(supplier.shop, product.shopifyProductId, 'active', [variantDetails]);
        await lambdaHandler(event);
        expect(broadcastSupplierProductModifications).toHaveBeenCalledTimes(1);
        expect(revertRetailerProductModifications).toHaveBeenCalledTimes(0);
    });

    it('should call revertRetailerProductModifications if the product is a retailer product', async () => {
        const { importedProduct, importedVariant, retailer } = orderEntireFlowDetails;
        const variantDetails = createVariantDetails(importedVariant.shopifyVariantId, 10, 10, '19.99');
        const event = createEvent(retailer.shop, importedProduct.shopifyProductId, 'active', [variantDetails]);
        await lambdaHandler(event);
        expect(broadcastSupplierProductModifications).toHaveBeenCalledTimes(0);
        expect(revertRetailerProductModifications).toHaveBeenCalledTimes(1);
    });

    it('should terminate early if product is not a supplier or retailer product', async () => {
        const { importedVariant, retailer } = orderEntireFlowDetails;
        const variantDetails = createVariantDetails(importedVariant.shopifyVariantId, 10, 10, '19.99');
        const event = createEvent(retailer.shop, nonExistentId, 'active', [variantDetails]);
        await lambdaHandler(event);
        expect(broadcastSupplierProductModifications).toHaveBeenCalledTimes(0);
        expect(revertRetailerProductModifications).toHaveBeenCalledTimes(0);
    });
});
