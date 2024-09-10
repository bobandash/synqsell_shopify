import type { GraphQL } from '~/types';
import getQueryStr from '../util/getQueryStr';
import { createMapIdToRestObj, errorHandler } from '~/services/util';
import getUserError from '../util/getUserError';
import type { Prisma } from '@prisma/client';
import {
  GET_VARIANTS_BASIC_INFO,
  VARIANT_CREATION_DETAILS_BULK_QUERY,
  VARIANTS_BULK_CREATION_MUTATION,
} from './graphql';
import type {
  VariantCreationInformationQuery,
  VariantBasicInfoQuery,
  ProductVariantsBulkCreateMutation,
} from '~/types/admin.generated';
import { fetchAndValidateGraphQLData, mutateGraphQLAdminData } from '../util';
import { v4 as uuid } from 'uuid';

type VariantWithInventoryAndOptions = Prisma.VariantGetPayload<{
  include: {
    inventoryItem: true;
  };
}>;

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
    const response = await graphql(GET_VARIANTS_BASIC_INFO, {
      variables: {
        query: queryStr,
        first: take,
      },
    });
    const { data } = await response.json();
    if (!data) {
      throw getUserError({
        defaultMessage: 'Could not fetch variant details.',
        parentFunc: getBasicVariantDetails,
        data: {
          shopifyVariantIds,
          take,
        },
      });
    }
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

export async function getVariantCreationInputWithAccessToken(
  variants: VariantWithInventoryAndOptions[],
  supplierSession: Session,
  supplierName: string,
  shopifyLocationId: string,
) {
  try {
    const shopifyVariantIds = variants.map(
      ({ shopifyVariantId }) => shopifyVariantId,
    );
    const queryStr = getQueryStr(shopifyVariantIds);
    const numVariants = shopifyVariantIds.length;
    const variantShopifyData =
      await fetchAndValidateGraphQLData<VariantCreationInformationQuery>(
        supplierSession.shop,
        supplierSession.accessToken,
        VARIANT_CREATION_DETAILS_BULK_QUERY,
        {
          query: queryStr,
          first: numVariants,
        },
      );

    const shopifyVariantIdToPrismaData = createMapIdToRestObj(
      variants,
      'shopifyVariantId',
    );
    // sometimes the query field doesn't match the mutation field,
    // so there are some fields that have to be mapped manually
    const variantsBulkInput = variantShopifyData.productVariants.edges.map(
      ({ node: variant }) => {
        const prismaData = shopifyVariantIdToPrismaData.get(variant.id);
        if (!prismaData) {
          throw new Error(
            'Variant exists in shopify but not in prisma database.',
          );
        }
        const {
          inventoryItem,
          inventoryQuantity,
          selectedOptions,
          id,
          ...rest
        } = variant;
        // for some reason, sku is a required field for variants even though documentation says otherwise
        const sku = inventoryItem.sku
          ? `Synqsell ${supplierName} ${inventoryItem.sku}`
          : `Synqsell ${supplierName} ${uuid()}`;

        // TODO: handle media ids
        return {
          ...rest,
          inventoryItem: {
            ...inventoryItem,
            cost: prismaData.supplierProfit,
            sku: sku,
          },
          inventoryQuantities: [
            {
              availableQuantity: inventoryQuantity ?? 0,
              locationId: shopifyLocationId,
            },
          ],
          optionValues: selectedOptions.map((option) => {
            return {
              name: option.value,
              optionName: option.name,
            };
          }),
          price: prismaData.retailPrice,
        };
      },
    );

    return variantsBulkInput;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to get relevant variant information from variant ids.',
      getVariantCreationInputWithAccessToken,
      { variants },
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
      await mutateGraphQLAdminData<ProductVariantsBulkCreateMutation>(
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
