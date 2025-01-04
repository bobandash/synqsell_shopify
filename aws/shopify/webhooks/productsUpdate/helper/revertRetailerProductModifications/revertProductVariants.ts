import { Session } from '@prisma/client';
import { EditedVariant } from '../../types';
import { PoolClient } from 'pg';
import {
    getRetailerAndSupplierVariantIds,
    hasImportantRetailerVariantChanges,
    revertRetailerVariantInventory,
    revertRetailerVariantPrices,
} from './helper';
import { getVariantDataShopify } from '../util/graphql';

async function revertProductVariants(
    retailerShopifyProductId: string,
    retailerEditedVariants: EditedVariant[],
    retailerSession: Session,
    supplierSession: Session,
    client: PoolClient,
) {
    const retailerShopifyVariantIds = retailerEditedVariants.map(({ shopifyVariantId }) => shopifyVariantId);
    const retailerAndSupplierVariantIds = await getRetailerAndSupplierVariantIds(retailerShopifyVariantIds, client);
    const supplierShopifyVariantIds = retailerAndSupplierVariantIds.map(
        ({ supplierShopifyVariantId }) => supplierShopifyVariantId,
    );
    const supplierShopifyVariantData = await getVariantDataShopify(supplierSession, supplierShopifyVariantIds);
    // We must prevent the products/update webhook from triggering indefinitely
    // in order to do so, we have to check if we need to make a mutation in the first place
    // otherwise, it would constantly call update variant over and over again, and trigger the products/update webhook
    const needsMutation = hasImportantRetailerVariantChanges(
        retailerEditedVariants,
        supplierShopifyVariantData,
        retailerAndSupplierVariantIds,
    );
    if (!needsMutation) {
        return;
    }
    await Promise.all([
        revertRetailerVariantPrices(
            supplierShopifyVariantData,
            retailerAndSupplierVariantIds,
            retailerSession,
            retailerShopifyProductId,
        ),
        revertRetailerVariantInventory(supplierShopifyVariantData, retailerSession, client),
    ]);
}

export default revertProductVariants;
