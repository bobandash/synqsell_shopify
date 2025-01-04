import {
    ADJUST_INVENTORY_MUTATION,
    GET_PRODUCT_STATUS,
    PRODUCT_VARIANT_BULK_UPDATE_PRICE,
    PRODUCT_VARIANT_INFO,
    UPDATE_PRODUCT_MUTATION,
} from '../../graphql';
import { ProductStatus } from '../../types';
import { ProductStatusQuery, ProductVariantInfoQuery, UpdateProductMutation } from '../../types/admin.generated';
import { Session } from '/opt/nodejs/models/types';
import { fetchAndValidateGraphQLData, mutateAndValidateGraphQLData } from '/opt/nodejs/utils';

type VariantUpdateMutation = {
    id: string; // shopifyVariantId
    price: any;
    inventoryItem?: {
        cost?: string;
    };
}[];

type SessionGraphQLDetail = {
    shop: string;
    accessToken: string;
};

async function updateProductStatusShopify(
    session: Session | SessionGraphQLDetail,
    shopifyProductId: string,
    status: ProductStatus,
) {
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

async function getProductStatusShopify(session: Session | SessionGraphQLDetail, shopifyProductId: string) {
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

async function updateInventoryShopify(
    session: Session | SessionGraphQLDetail,
    shopifyInventoryItemId: string,
    shopifyLocationId: string,
    quantity: number,
) {
    const input = {
        reason: 'other',
        ignoreCompareQuantity: true,
        name: 'available',
        quantities: {
            inventoryItemId: shopifyInventoryItemId,
            locationId: shopifyLocationId,
            quantity: quantity ?? 0,
        },
    };
    return mutateAndValidateGraphQLData(
        session.shop,
        session.accessToken,
        ADJUST_INVENTORY_MUTATION,
        {
            input,
        },
        'Could not adjust retailer quantity.',
    );
}

export async function updateVariantShopify(
    session: Session | SessionGraphQLDetail,
    shopifyProductId: string,
    variantUpdateInput: VariantUpdateMutation,
) {
    await mutateAndValidateGraphQLData(
        session.shop,
        session.accessToken,
        PRODUCT_VARIANT_BULK_UPDATE_PRICE,
        {
            productId: shopifyProductId,
            variants: variantUpdateInput,
        },
        'Failed to update variants.',
    );
}

export async function getVariantDataShopify(session: Session | SessionGraphQLDetail, shopifyVariantIds: string[]) {
    const supplierVariantData = await Promise.all(
        shopifyVariantIds.map((shopifyVariantId) =>
            fetchAndValidateGraphQLData<ProductVariantInfoQuery>(
                session.shop,
                session.accessToken,
                PRODUCT_VARIANT_INFO,
                {
                    id: shopifyVariantId,
                },
            ),
        ),
    );
    return supplierVariantData;
}

export { updateProductStatusShopify, getProductStatusShopify, updateInventoryShopify };
