import type { Prisma } from '@prisma/client';
import type {
  BasicVariantInfo,
  BasicVariantInfoWithoutVariantId,
} from '../models/variants';
import { errorHandler } from '../util';
import { getRelevantVariantInformationForPrisma } from '../shopify/variants';
import type { GraphQL } from '~/types';
import type { VariantInformationForPrismaQueryQuery } from '~/types/admin.generated';
import createHttpError from 'http-errors';
import logger from '~/logger';

function getMapVariantIdToOtherFields(variants: BasicVariantInfo[]) {
  const variantIdToOtherFields = new Map<
    string,
    BasicVariantInfoWithoutVariantId
  >();
  variants.forEach(({ variantId, ...rest }) => {
    variantIdToOtherFields.set(variantId, {
      ...rest,
    });
  });
  return variantIdToOtherFields;
}

// returns data in prisma's format that can automatically be injected to create variants
function getFormattedAddVariantData(
  data: VariantInformationForPrismaQueryQuery,
  variants: BasicVariantInfo[],
) {
  const variantIdToOtherFieldsMap = getMapVariantIdToOtherFields(variants);
  const productVariants = data.productVariants.edges;

  return productVariants.map(({ node: variant }) => {
    const {
      id: variantId,
      compareAtPrice,
      price,
      inventoryQuantity,
      inventoryPolicy,
      taxCode,
      taxable,
      inventoryItem,
    } = variant;
    const otherFields = variantIdToOtherFieldsMap.get(variantId);
    // TODO: Determine logging strategy for inline error throws
    if (!otherFields) {
      logger.error(
        `Invalid data. ${variantId} does not exist in provided data in function getFormattedAddVariantData`,
        { data, variants },
      );
      throw new createHttpError.BadRequest(
        'Invalid data: variantId does not exist.',
      );
    }
    const { prismaProductId, wholesalePrice } = otherFields;

    return {
      variantId,
      compareAtPrice,
      productId: prismaProductId,
      wholesalePrice,
      inventoryQuantity,
      inventoryPolicy,
      price,
      taxCode,
      taxable,
      InventoryItem: {
        countryCodeOfOrigin: inventoryItem.countryCodeOfOrigin,
        harmonizedSystemCode: inventoryItem.harmonizedSystemCode,
        weightUnit: inventoryItem.measurement.weight?.unit,
        weightValue: inventoryItem.measurement.weight?.value,
        provinceCodeOfOrigin: inventoryItem.provinceCodeOfOrigin,
        requiresShipping: inventoryItem.requiresShipping,
        sku: inventoryItem.sku,
        tracked: inventoryItem.tracked,
      },
      VariantOption: variant.selectedOptions.map((option) => {
        return {
          name: option.name,
          value: option.value,
        };
      }),
    };
  });
}

export async function addVariantsTx(
  tx: Prisma.TransactionClient,
  variants: BasicVariantInfo[],
  sessionId: string,
  graphql: GraphQL,
) {
  try {
    const variantIds = variants.map(({ variantId: id }) => id);
    const graphqlData = await getRelevantVariantInformationForPrisma(
      variantIds,
      sessionId,
      graphql,
    );
    if (!graphqlData) {
      return null;
    }
    const prismaData = getFormattedAddVariantData(graphqlData, variants);
    await tx.variant.createMany({
      data: prismaData,
    });
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to add variants in bulk.',
      addVariantsTx,
      { variants },
    );
  }
}
