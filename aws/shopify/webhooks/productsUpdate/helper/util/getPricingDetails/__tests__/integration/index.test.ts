import { DatabaseSetup, disconnectClient, setupDatabase, teardownPool } from '~/test-db-setup';
import { generateRandomRetailPrice } from '@db/fixtures';
import * as utils from '../../util';
import getVariantPricingDetails from '../..';
import { createTestGeneralPriceListWithProducts, TestGeneralPriceList } from '@db/factories/pricelist.factories';
import { PRICE_LIST_PRICING_STRATEGY } from '@db/constants';

const getMarginPricingDetailsSpy = jest.spyOn(utils, 'getMarginPricingDetails');
const getWholesalePricingDetailsSpy = jest.spyOn(utils, 'getWholesalePricingDetails');

describe('getPricingDetails', () => {
    let marginPriceList: TestGeneralPriceList;
    let wholesalePriceList: TestGeneralPriceList;

    let database: DatabaseSetup;
    beforeEach(async () => {
        jest.clearAllMocks();
        database = await setupDatabase();
        marginPriceList = await createTestGeneralPriceListWithProducts(PRICE_LIST_PRICING_STRATEGY.MARGIN);
        wholesalePriceList = await createTestGeneralPriceListWithProducts(PRICE_LIST_PRICING_STRATEGY.WHOLESALE);
    });

    afterEach(() => {
        disconnectClient(database.client);
    });

    afterAll(async () => {
        teardownPool(database.pool);
    });

    describe('getVariantPricingDetails', () => {
        it('should call getMarginPricingDetails when price list is margin pricing strategy', async () => {
            const { client } = database;
            const { variant, priceList, product } = marginPriceList;
            const newRetailPrice = generateRandomRetailPrice();
            const editedVariants = [
                {
                    shopifyVariantId: variant.shopifyVariantId,
                    retailPrice: newRetailPrice,
                },
            ];
            await getVariantPricingDetails(editedVariants, priceList, product.shopifyProductId, client);
            expect(getWholesalePricingDetailsSpy).toHaveBeenCalledTimes(0);
            expect(getMarginPricingDetailsSpy).toHaveBeenCalledTimes(1);
        });

        it('should call getWholesalePricingDetailsSpy when price list is wholesale pricing strategy', async () => {
            const { client } = database;
            const { variant, priceList, product } = wholesalePriceList;
            const newRetailPrice = generateRandomRetailPrice();
            const editedVariants = [
                {
                    shopifyVariantId: variant.shopifyVariantId,
                    retailPrice: newRetailPrice,
                },
            ];
            await getVariantPricingDetails(editedVariants, priceList, product.shopifyProductId, client);
            expect(getWholesalePricingDetailsSpy).toHaveBeenCalledTimes(1);
            expect(getMarginPricingDetailsSpy).toHaveBeenCalledTimes(0);
        });
    });
});
