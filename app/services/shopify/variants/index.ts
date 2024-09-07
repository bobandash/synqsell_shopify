import type { GraphQL } from '~/types';
import getQueryStr from '../util/getQueryStr';
import { errorHandler } from '~/services/util';
import getUserError from '../util/getUserError';
import type { Prisma } from '@prisma/client';
import type {
  CountryCode,
  ProductVariantInventoryPolicy,
  WeightUnit,
  ProductVariantsBulkCreateStrategy,
} from '~/types/admin.types';
import { v4 as uuidv4 } from 'uuid';
import { CREATE_VARIANTS_BULK_MUTATION, GET_VARIANTS } from './graphql';

type CreateVariant = Prisma.VariantGetPayload<{
  include: {
    inventoryItem: true;
    variantOptions: true;
  };
}>;

export async function getVariantInformation(
  variantIds: string[],
  sessionId: string,
  graphql: GraphQL,
) {
  try {
    const queryStr = getQueryStr(variantIds);
    const numVariants = variantIds.length;
    const response = await graphql(GET_VARIANTS, {
      variables: {
        query: queryStr,
        first: numVariants,
      },
    });
    const { data } = await response.json();
    if (!data) {
      throw getUserError({
        defaultMessage: 'Data is missing from retrieving variant information.',
        parentFunc: getVariantInformation,
        data: { variantIds, sessionId },
      });
    }
    return data;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to get relevant variant information from variant ids.',
      getVariantInformation,
      { variantIds, sessionId },
    );
  }
}

export async function createVariants(
  variants: CreateVariant[],
  newProductId: string,
  shopifyLocationId: string,
  graphql: GraphQL,
) {
  try {
    const variantInput = variants.map((variant) => {
      const { inventoryItem: inventoryItemValues } = variant;
      const measurement =
        inventoryItemValues?.weightUnit && inventoryItemValues?.weightValue
          ? {
              weight: {
                unit: inventoryItemValues.weightUnit as WeightUnit,
                value: inventoryItemValues.weightValue,
              },
            }
          : undefined;

      const inventoryItem = inventoryItemValues
        ? {
            countryCodeOfOrigin:
              (inventoryItemValues.countryCodeOfOrigin as CountryCode) ??
              undefined,
            harmonizedSystemCode: inventoryItemValues.harmonizedSystemCode,
            measurement,
            provinceCodeOfOrigin: inventoryItemValues.provinceCodeOfOrigin,
            requiresShipping: inventoryItemValues.requiresShipping,
            sku: inventoryItemValues.sku
              ? `Synqsell-${inventoryItemValues.sku}`
              : `Synqsell-${uuidv4()}`,
            tracked: inventoryItemValues.tracked,
          }
        : undefined;

      return {
        barcode: variant.barcode,
        compareAtPrice: variant.compareAtPrice,
        inventoryItem,
        inventoryPolicy:
          variant.inventoryPolicy as ProductVariantInventoryPolicy,
        inventoryQuantities: [
          {
            availableQuantity: variant.inventoryQuantity ?? 0,
            locationId: shopifyLocationId,
          },
        ],
        optionValues: variant.variantOptions.map((option) => {
          return {
            name: option.value,
            optionName: option.name,
          };
        }),
        price: variant.price,
        taxCode: variant.taxCode,
        taxable: variant.taxable,
      };
    });

    const createVariantResponse = await graphql(CREATE_VARIANTS_BULK_MUTATION, {
      variables: {
        productId: newProductId,
        variants: variantInput,
        strategy:
          'REMOVE_STANDALONE_VARIANT' as ProductVariantsBulkCreateStrategy.RemoveStandaloneVariant,
      },
    });
    const { data } = await createVariantResponse.json();
    const productVariantsBulkCreate = data?.productVariantsBulkCreate;

    if (
      !productVariantsBulkCreate ||
      !productVariantsBulkCreate.productVariants ||
      (productVariantsBulkCreate.userErrors &&
        productVariantsBulkCreate.userErrors.length > 0)
    ) {
      throw getUserError({
        defaultMessage:
          'Data is missing from deleting fulfillment service in Shopify.',
        userErrors: productVariantsBulkCreate?.userErrors,
        parentFunc: createVariants,
        data: { variants, newProductId, shopifyLocationId },
      });
    }

    const newVariantIds = productVariantsBulkCreate.productVariants.map(
      ({ id }) => id,
    );

    return newVariantIds;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to create variants on Shopify.',
      createVariants,
      { variants, newProductId, shopifyLocationId },
    );
  }
}
