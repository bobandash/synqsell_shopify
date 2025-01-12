import type { Session } from '/opt/nodejs/models/types';
import { ProductStatus } from '../../types';
import { getProductFromRetailerShopifyProductId } from '/opt/nodejs/models/product';
import { PoolClient } from 'pg';
import { getProductStatusShopify, updateProductStatusShopify } from '../util';

async function revertProductStatus(
    retailerShopifyProductId: string,
    retailerProductStatus: ProductStatus,
    retailerSession: Session,
    supplierSession: Session,
    client: PoolClient,
) {
    const { shopifyProductId: supplierShopifyProductId } = await getProductFromRetailerShopifyProductId(
        retailerShopifyProductId,
        client,
    );
    const supplierProductStatus = await getProductStatusShopify(supplierSession, supplierShopifyProductId);
    if (supplierProductStatus === retailerProductStatus) {
        return;
    }
    await updateProductStatusShopify(retailerSession, retailerShopifyProductId, supplierProductStatus);
}

export default revertProductStatus;
