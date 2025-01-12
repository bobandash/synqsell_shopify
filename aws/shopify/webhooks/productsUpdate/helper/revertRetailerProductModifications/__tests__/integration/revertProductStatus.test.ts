import { DatabaseSetup, disconnectClient, setupDatabase, teardownPool } from '~/test-db-setup';
import { createTestOrderWithEntireFlow, type TestOrderEntireFlow } from '@db/factories/order.factories';
import { PRODUCT_STATUS } from '/opt/nodejs/constants';
import revertProductStatus from '../../revertProductStatus';
import { updateProductStatusShopify, getProductStatusShopify } from '../../../util';

jest.mock('../../../util', () => ({
    getProductStatusShopify: jest.fn(),
    updateProductStatusShopify: jest.fn(),
}));
jest.mock('/opt/nodejs/utils', () => ({
    mutateAndValidateGraphQLData: jest.fn(),
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

    it(`should update product status on Shopify if retailer's imported product does not match supplier's`, async () => {
        const { client } = database;
        const { importedProduct, retailer, supplier } = orderEntireFlowDetails;
        (getProductStatusShopify as jest.Mock).mockResolvedValueOnce(PRODUCT_STATUS.ARCHIVED);
        await revertProductStatus(importedProduct.shopifyProductId, PRODUCT_STATUS.ACTIVE, retailer, supplier, client);
        expect(updateProductStatusShopify).toHaveBeenCalledTimes(1);
        expect(updateProductStatusShopify).toHaveBeenCalledWith(
            retailer,
            importedProduct.shopifyProductId,
            PRODUCT_STATUS.ARCHIVED,
        );
    });

    it(`should not update product status on Shopify if retailer's imported product matches supplier's`, async () => {
        const { client } = database;
        const { importedProduct, retailer, supplier } = orderEntireFlowDetails;
        (getProductStatusShopify as jest.Mock).mockResolvedValueOnce(PRODUCT_STATUS.ACTIVE);
        await revertProductStatus(importedProduct.shopifyProductId, PRODUCT_STATUS.ACTIVE, retailer, supplier, client);
        expect(updateProductStatusShopify).toHaveBeenCalledTimes(0);
    });
});
