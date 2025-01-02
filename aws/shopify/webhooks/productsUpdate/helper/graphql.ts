import { GET_PRODUCT_STATUS, UPDATE_PRODUCT_MUTATION } from '../graphql';
import { ProductStatus } from '../types';
import { ProductStatusQuery, UpdateProductMutation } from '../types/admin.generated';
import { Session } from '/opt/nodejs/models/types';
import { fetchAndValidateGraphQLData, mutateAndValidateGraphQLData } from '/opt/nodejs/utils';

async function updateProductStatusShopify(session: Session, shopifyProductId: string, status: ProductStatus) {
    await mutateAndValidateGraphQLData<UpdateProductMutation>(
        session.shop,
        session.accessToken,
        UPDATE_PRODUCT_MUTATION,
        {
            input: {
                id: shopifyProductId,
                status,
            },
        },
        `Failed to update product status.`,
    );
}

async function getProductStatusShopify(session: Session, shopifyProductId: string) {
    const res = await fetchAndValidateGraphQLData<ProductStatusQuery>(
        session.shop,
        session.accessToken,
        GET_PRODUCT_STATUS,
        {
            id: shopifyProductId,
        },
    );
    const productStatus = res.product?.status;
    if (!productStatus) {
        throw new Error(`${shopifyProductId} does not have a product status.`);
    }
    return productStatus;
}

export { updateProductStatusShopify, getProductStatusShopify };
