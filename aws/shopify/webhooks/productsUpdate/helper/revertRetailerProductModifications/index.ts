import { PRODUCT_STATUS } from '/opt/nodejs/constants';
import {
    getRetailerSessionFromRetailerShopifyProductId,
    getSupplierSessionFromRetailerShopifyProductId,
} from '/opt/nodejs/models/session';
import { EditedVariant, ProductStatus } from '../../types';
import { PoolClient } from 'pg';
import { updateProductStatusShopify } from '../util';
import revertProductVariants from './revertProductVariants';
import revertProductStatus from './revertProductStatus';

// ==============================================================================================================
// START: COORDINATOR FOR REVERTING ANY CHANGES THE RETAILER SHOULD NOT BE ABLE TO MAKE (E.G. PRICE, INV, STATUS)
// ==============================================================================================================
async function revertRetailerProductModifications(
    retailerShopifyProductId: string,
    retailerEditedVariants: EditedVariant[],
    retailerProductStatus: ProductStatus,
    client: PoolClient,
) {
    const [supplierSession, retailerSession] = await Promise.all([
        getSupplierSessionFromRetailerShopifyProductId(retailerShopifyProductId, client),
        getRetailerSessionFromRetailerShopifyProductId(retailerShopifyProductId, client),
    ]);

    // there are two potential things that you can be reverted
    // product variants - which related to inventory and price
    // product status - which is the status of the product (active, archived, or draft)
    if (!supplierSession.isAppUninstalled) {
        await Promise.all([
            revertProductVariants(
                retailerShopifyProductId,
                retailerEditedVariants,
                retailerSession,
                supplierSession,
                client,
            ),
            revertProductStatus(
                retailerShopifyProductId,
                retailerProductStatus,
                retailerSession,
                supplierSession,
                client,
            ),
        ]);
        return;
    }

    // case: supplier uninstalled the application but the retailer updates the product on their store
    // we will not be able to call mutations on the supplier's store because their access token is invalid
    // the product status has to be updated back to archived on retailer's store
    // TODO: when the supplier reinstalls the application, we have to resync any price changes the supplier made while the app was uninstalled from the application's code
    if (retailerProductStatus !== PRODUCT_STATUS.ARCHIVED) {
        await updateProductStatusShopify(retailerSession, retailerShopifyProductId, PRODUCT_STATUS.ARCHIVED);
    }
}

export default revertRetailerProductModifications;
