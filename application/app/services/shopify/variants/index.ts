import type { GraphQL } from '~/types';
import getQueryStr from '../utils/getQueryStr';
import { errorHandler } from '~/lib/utils/server';
import type { Prisma } from '@prisma/client';
import {
  GET_VARIANT_DELIVERY_PROFILES,
  GET_VARIANTS_BASIC_INFO,
  VARIANTS_BULK_CREATION_MUTATION,
} from './graphql';
import type {
  VariantBasicInfoQuery,
  ProductVariantsBulkCreateMutation,
  VariantDeliveryProfilesQuery,
} from '~/types/admin.generated';
import {
  queryExternalStoreAdminAPI,
  mutateInternalStoreAdminAPI,
  queryInternalStoreAdminAPI,
} from '../utils';

type Session = Prisma.SessionGetPayload<{}>;

export type BasicVariantDetails = {
  id: string;
  sku: string | null;
  title: string;
};

// helper function to flatten basic variant details
function flattenBasicVariantDetails(data: VariantBasicInfoQuery) {
  const flattenedData = data.productVariants.edges.map((edge) => {
    const variant = edge.node;
    return {
      id: variant.id,
      sku: variant.sku ?? null,
      title: variant.title,
    };
  });
  return flattenedData;
}

export async function getBasicVariantDetails(
  shopifyVariantIds: string[],
  take: number,
  graphql: GraphQL,
): Promise<BasicVariantDetails[]> {
  try {
    const queryStr = getQueryStr(shopifyVariantIds);
    const data = await queryInternalStoreAdminAPI<VariantBasicInfoQuery>(
      graphql,
      GET_VARIANTS_BASIC_INFO,
      {
        query: queryStr,
        first: take,
      },
    );
    const flattenedData = flattenBasicVariantDetails(data);
    return flattenedData;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to get shopify variant basic details.',
      createVariants,
      { shopifyVariantIds, take, graphql },
    );
  }
}

export async function getVariantDeliveryProfilesIdsWithAccessToken(
  shopifyVariantIds: string[],
  supplierSession: Session,
) {
  try {
    const queryStr = getQueryStr(shopifyVariantIds);
    const numVariants = shopifyVariantIds.length;
    const deliveryProfilesQuery =
      await queryExternalStoreAdminAPI<VariantDeliveryProfilesQuery>(
        supplierSession.shop,
        supplierSession.accessToken,
        GET_VARIANT_DELIVERY_PROFILES,
        {
          query: queryStr,
          first: numVariants,
        },
      );
    const deliveryProfileIds = deliveryProfilesQuery.productVariants.edges
      .map(({ node: { deliveryProfile } }) => deliveryProfile?.id)
      .filter((id) => id !== undefined);
    return deliveryProfileIds;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to create variants on Shopify.',
      getVariantDeliveryProfilesIdsWithAccessToken,
      { shopifyVariantIds },
    );
  }
}

export async function createVariants(
  shopifyProductId: string,
  shopifyProductCreationInput: any,
  graphql: GraphQL,
) {
  try {
    const data =
      await mutateInternalStoreAdminAPI<ProductVariantsBulkCreateMutation>(
        graphql,
        VARIANTS_BULK_CREATION_MUTATION,
        {
          productId: shopifyProductId,
          variants: shopifyProductCreationInput,
          strategy: 'REMOVE_STANDALONE_VARIANT',
        },
        'Failed to create product on Shopify',
      );

    return data;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to create variants on Shopify.',
      createVariants,
      { shopifyProductCreationInput },
    );
  }
}
