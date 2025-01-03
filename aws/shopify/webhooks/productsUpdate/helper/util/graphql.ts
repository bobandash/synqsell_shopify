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

type VariantPriceMutationInput = {
    shopifyVariantId: string;
    price: any;
}[];

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

async function updateInventoryShopify(
    session: Session,
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

export async function updatePriceShopify(
    session: Session,
    shopifyProductId: string,
    variantsAndPrice: VariantPriceMutationInput,
) {
    const variantsInput = variantsAndPrice.map(({ shopifyVariantId, price }) => ({
        id: shopifyVariantId,
        price,
    }));

    await mutateAndValidateGraphQLData(
        session.shop,
        session.accessToken,
        PRODUCT_VARIANT_BULK_UPDATE_PRICE,
        {
            productId: shopifyProductId,
            variants: variantsInput,
        },
        'Failed to update price for retailer product.',
    );
}

export async function getShopifyVariantData(shopifyVariantIds: string[], supplierSession: Session) {
    const supplierVariantData = await Promise.all(
        shopifyVariantIds.map((shopifyVariantId) =>
            fetchAndValidateGraphQLData<ProductVariantInfoQuery>(
                supplierSession.shop,
                supplierSession.accessToken,
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
