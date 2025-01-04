import { DatabaseSetup, disconnectClient, setupDatabase, teardownPool } from '~/test-db-setup';
import { createTestOrderWithEntireFlow, type TestOrderEntireFlow } from '@db/factories/order.factories';
import { PRODUCT_STATUS } from '/opt/nodejs/constants';
import { updateProductStatusShopify } from '../../../util';
import revertRetailerProductModifications from '../..';
import db from '@db/test-db';
import { createEditedVariant } from '../utils';
import revertProductStatus from '../../revertProductStatus';
import revertProductVariants from '../../revertProductVariants';

jest.mock('../../../util', () => ({
    updateProductStatusShopify: jest.fn(),
    getProductStatusShopify: jest.fn(),
    updateInventoryShopify: jest.fn(),
    getVariantDataShopify: jest.fn(),
}));
jest.mock('/opt/nodejs/utils', () => ({
    ...jest.requireActual('/opt/nodejs/utils'),
    fetchAndValidateGraphQLData: jest.fn(),
    mutateAndValidateGraphQLData: jest.fn(),
}));
jest.mock('../../revertProductVariants', () => ({
    __esModule: true,
    default: jest.fn(),
}));

jest.mock('../../revertProductStatus', () => ({
    __esModule: true,
    default: jest.fn(),
}));

describe('revertProductStatus', () => {
    let orderEntireFlowDetails: TestOrderEntireFlow;
    let database: DatabaseSetup;
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

    it('should update product status to archived if status is updated while supplier uninstalled application', async () => {
        const { client } = database;
        const { importedProduct, importedVariant, supplier, retailer } = orderEntireFlowDetails;
        await db.session.update({
            where: {
                id: supplier.id,
            },
            data: {
                isAppUninstalled: true,
            },
        });
        const editedVariants = [createEditedVariant(importedVariant.shopifyVariantId, 0, '24.99', false)];
        await revertRetailerProductModifications(
            importedProduct.shopifyProductId,
            editedVariants,
            PRODUCT_STATUS.ACTIVE,
            client,
        );
        updateProductStatusShopify as jest.Mock;
        expect(updateProductStatusShopify).toHaveBeenCalledTimes(1);
        expect(updateProductStatusShopify).toHaveBeenCalledWith(
            retailer,
            importedProduct.shopifyProductId,
            PRODUCT_STATUS.ARCHIVED,
        );
    });

    it('should call revert product variants and product status if product updated while supplier has application still installed', async () => {
        const { client } = database;
        const { importedProduct, importedVariant, retailer, supplier } = orderEntireFlowDetails;
        const editedVariants = [createEditedVariant(importedVariant.shopifyVariantId, 0, '24.99', false)];
        await revertRetailerProductModifications(
            importedProduct.shopifyProductId,
            editedVariants,
            PRODUCT_STATUS.ACTIVE,
            client,
        );
        expect(updateProductStatusShopify).toHaveBeenCalledTimes(0);
        expect(revertProductVariants).toHaveBeenCalledTimes(1);
        expect(revertProductVariants).toHaveBeenCalledWith(
            importedProduct.shopifyProductId,
            editedVariants,
            retailer,
            supplier,
            client,
        );
        expect(revertProductStatus).toHaveBeenCalledTimes(1);
        expect(revertProductStatus).toHaveBeenCalledWith(
            importedProduct.shopifyProductId,
            PRODUCT_STATUS.ACTIVE,
            retailer,
            supplier,
            client,
        );
    });
});
