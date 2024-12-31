import { createTestOrderWithEntireFlow, TestOrderEntireFlow } from '@db/factories/order.factories';
import initializePool, { pool } from '@db/test-pool';
import { lambdaHandler } from '../../app';
import { ShopifyEvent } from '../../types';
import { markRetailerProductsArchived } from '../../helper';
import db from '@db/test-db';
import { createTestSession } from '@db/factories/session.factories';
import { generateBilling } from '@db/factories/billing.factories';
import { simpleFaker } from '@faker-js/faker/.';
import * as importedProductModels from '/opt/nodejs/models/importedProduct';
import { generateRole } from '@db/factories/role.factories';
import { ROLES } from '@db/constants';

const deleteAllImportedProductsSpy = jest.spyOn(importedProductModels, 'deleteAllImportedProducts');
jest.mock('../../helper', () => ({
    markRetailerProductsArchived: jest.fn(),
}));

jest.mock('../../db.ts', () => ({
    initializePool: initializePool,
}));

describe('AppUninstalled Shopify Webhook', () => {
    let orderEntireFlowDetails: TestOrderEntireFlow;
    beforeEach(async () => {
        jest.clearAllMocks();
        orderEntireFlowDetails = await createTestOrderWithEntireFlow();
    });

    afterAll(async () => {
        if (pool) {
            await pool.end();
        }
    });

    it('should successfully handle supplier flow', async () => {
        const { supplier, supplierBilling } = orderEntireFlowDetails;
        const supplierEvent = {
            id: simpleFaker.string.uuid(),
            detail: {
                metadata: {
                    'X-Shopify-Shop-Domain': supplier.shop,
                },
            },
        };
        await lambdaHandler(supplierEvent as ShopifyEvent);
        const billingExists =
            (await db.billing.count({
                where: {
                    id: supplierBilling.id,
                },
            })) > 0;
        const uninstalledStatus = (
            await db.session.findFirstOrThrow({
                where: {
                    id: supplier.id,
                },
                select: {
                    isAppUninstalled: true,
                },
            })
        ).isAppUninstalled;

        expect(markRetailerProductsArchived).toHaveBeenCalledTimes(1);
        expect(deleteAllImportedProductsSpy).toHaveBeenCalledTimes(0);
        expect(billingExists).toBe(false);
        expect(uninstalledStatus).toBe(true);
    });

    it('should successfully handle retailer flow', async () => {
        const { retailer, retailerBilling } = orderEntireFlowDetails;
        const retailerEvent = {
            id: simpleFaker.string.uuid(),
            detail: {
                metadata: {
                    'X-Shopify-Shop-Domain': retailer.shop,
                },
            },
        };
        await lambdaHandler(retailerEvent as ShopifyEvent);
        const billingExists =
            (await db.billing.count({
                where: {
                    id: retailerBilling.id,
                },
            })) > 0;
        const uninstalledStatus = (
            await db.session.findFirstOrThrow({
                where: {
                    id: retailer.id,
                },
                select: {
                    isAppUninstalled: true,
                },
            })
        ).isAppUninstalled;
        const numImportedProducts = await db.importedProduct.count({
            where: {
                retailerId: retailer.id,
            },
        });

        expect(billingExists).toBe(false);
        expect(uninstalledStatus).toBe(true);
        expect(deleteAllImportedProductsSpy).toHaveBeenCalledTimes(1);
        expect(numImportedProducts).toBe(0);
    });

    it('should successfully handle user flow (supplier and retailer)', async () => {
        const { retailer, retailerBilling } = orderEntireFlowDetails;
        await generateRole(retailer.id, ROLES.SUPPLIER);
        const retailerEvent = {
            id: simpleFaker.string.uuid(),
            detail: {
                metadata: {
                    'X-Shopify-Shop-Domain': retailer.shop,
                },
            },
        };
        await lambdaHandler(retailerEvent as ShopifyEvent);
        const billingExists =
            (await db.billing.count({
                where: {
                    id: retailerBilling.id,
                },
            })) > 0;
        const uninstalledStatus = (
            await db.session.findFirstOrThrow({
                where: {
                    id: retailer.id,
                },
                select: {
                    isAppUninstalled: true,
                },
            })
        ).isAppUninstalled;
        expect(markRetailerProductsArchived).toHaveBeenCalledTimes(1);
        expect(deleteAllImportedProductsSpy).toHaveBeenCalledTimes(1);
        expect(billingExists).toBe(false);
        expect(uninstalledStatus).toBe(true);
    });

    it('should successfully handle user flow (not supplier or retailer)', async () => {
        const newSession = await createTestSession();
        const newBilling = await generateBilling(newSession.id);
        const uninstallEvent = {
            id: simpleFaker.string.uuid(),
            detail: {
                metadata: {
                    'X-Shopify-Shop-Domain': newSession.shop,
                },
            },
        };
        await lambdaHandler(uninstallEvent as ShopifyEvent);
        const billingExists =
            (await db.billing.count({
                where: {
                    id: newBilling.id,
                },
            })) > 0;
        const uninstalledStatus = (
            await db.session.findFirstOrThrow({
                where: {
                    id: newSession.id,
                },
                select: {
                    isAppUninstalled: true,
                },
            })
        ).isAppUninstalled;
        expect(deleteAllImportedProductsSpy).toHaveBeenCalledTimes(0);
        expect(markRetailerProductsArchived).toHaveBeenCalledTimes(0);
        expect(billingExists).toBe(false);
        expect(uninstalledStatus).toBe(true);
    });
});
