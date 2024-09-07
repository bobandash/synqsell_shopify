import type { Prisma } from '@prisma/client';
import type {
  BasicVariantInfo,
  BasicVariantInfoWithoutVariantId,
} from '../models/variants';
import { errorHandler } from '../util';
import { getVariantInformation } from '../shopify/variants';
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
      id: shopifyVariantId,
      compareAtPrice,
      price,
      inventoryQuantity,
      inventoryPolicy,
      taxCode,
      taxable,
      inventoryItem,
      barcode,
    } = variant;
    const otherFields = variantIdToOtherFieldsMap.get(shopifyVariantId);
    // TODO: Determine logging strategy for inline error throws
    if (!otherFields) {
      logger.error(
        `Invalid data. ${shopifyVariantId} does not exist in provided data in function getFormattedAddVariantData`,
        { data, variants },
      );
      throw new createHttpError.BadRequest(
        'Invalid data: shopifyVariantId does not exist.',
      );
    }
    const { prismaProductId, wholesalePrice } = otherFields;

    return {
      shopifyVariantId,
      compareAtPrice,
      productId: prismaProductId,
      wholesalePrice,
      inventoryQuantity,
      inventoryPolicy,
      price,
      taxCode,
      taxable,
      barcode,
      inventoryItem: {
        create: {
          countryCodeOfOrigin: inventoryItem.countryCodeOfOrigin,
          harmonizedSystemCode: inventoryItem.harmonizedSystemCode,
          weightUnit: inventoryItem.measurement.weight?.unit,
          weightValue: inventoryItem.measurement.weight?.value,
          provinceCodeOfOrigin: inventoryItem.provinceCodeOfOrigin,
          requiresShipping: inventoryItem.requiresShipping,
          ...(inventoryItem.sku && { sku: inventoryItem.sku }),
          tracked: inventoryItem.tracked,
        },
      },
      variantOptions: {
        create: variant.selectedOptions.map((option) => {
          return {
            name: option.name,
            value: option.value,
          };
        }),
      },
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
    const graphqlData = await getVariantInformation(
      variantIds,
      sessionId,
      graphql,
    );
    const prismaData = getFormattedAddVariantData(graphqlData, variants);
    await Promise.all(
      prismaData.map((data) =>
        tx.variant.create({
          data: data,
        }),
      ),
    );
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to add variants in bulk.',
      addVariantsTx,
      { variants },
    );
  }
}
