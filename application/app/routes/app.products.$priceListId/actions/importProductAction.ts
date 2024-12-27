import { type InferType, object, string } from 'yup';
import { INTENTS } from '../constants';
import { productIdSchema, sessionIdSchema } from '~/schemas/models';
import type { GraphQL } from '~/types';
import { json } from '@remix-run/node';
import { StatusCodes } from 'http-status-codes';
import {
  getAllProductDetails,
  type AllProductDetails,
  type ProductWithVariants,
} from '~/services/models/product.server';
import {
  createProduct,
  getProductAndMediaCreationInputWithAccessToken,
} from '~/services/shopify/products';
import { getSession, type Session } from '~/services/models/session.server';
import { getPriceList } from '~/services/models/priceList.server';
import { userGetFulfillmentService } from '~/services/models/fulfillmentService.server';
import { getProfile } from '~/services/models/userProfile.server';
import { createVariants } from '~/services/shopify/variants';
import type {
  ProductVariantsBulkCreateMutation,
  VariantCreationInformationQuery,
} from '~/types/admin.generated';
import db from '~/db.server';
import type { Prisma } from '@prisma/client';
import {
  addPriceListToPartnershipTx,
  createPartnershipsTx,
  getSupplierRetailerPartnership,
  isSupplierRetailerPartnered,
} from '~/services/models/partnership.server';
import {
  deletePartnershipRequestTx,
  getPartnershipRequest,
  hasPartnershipRequest,
} from '~/services/models/partnershipRequest.server';
import { CHECKLIST_ITEM_KEYS, PARTNERSHIP_REQUEST_TYPE } from '~/constants';
import getQueryStr from '~/services/shopify/utils/getQueryStr';
import { queryExternalStoreAdminAPI } from '~/services/shopify/utils';
import { VARIANT_CREATION_DETAILS_BULK_QUERY } from '~/services/shopify/variants/graphql';
import { v4 as uuid } from 'uuid';
import { createMapIdToRestObj } from '~/lib/utils';
import { getRouteError, logError } from '~/lib/utils/server';
import { updateChecklistStatus } from '~/services/models/checklistStatus.server';

export type ImportProductFormData = InferType<typeof formDataObjectSchema>;

const formDataObjectSchema = object({
  intent: string().oneOf([INTENTS.IMPORT_PRODUCT]).required(),
  productId: productIdSchema,
});

const importProductActionSchema = object({
  formDataObject: formDataObjectSchema,
  sessionId: sessionIdSchema,
});

export async function addImportedProductToDatabaseTx(
  tx: Prisma.TransactionClient,
  importedProduct: ProductVariantsBulkCreateMutation,
  parentProduct: ProductWithVariants,
  retailerId: string,
) {
  const productVariantsBulkCreate = importedProduct.productVariantsBulkCreate;
  const shopifyImportedProduct = productVariantsBulkCreate?.product;
  const shopifyImportedVariants = productVariantsBulkCreate?.productVariants;

  const prismaData = {
    prismaProductId: parentProduct.id,
    shopifyProductId: shopifyImportedProduct!.id,
    retailerId,
    importedVariants: {
      create: shopifyImportedVariants?.map((shopifyImportedVariant, index) => {
        const prismaVariantId = parentProduct.variants[index].id;
        const prismaInventoryItemId =
          parentProduct.variants[index].inventoryItem!.id;
        return {
          prismaVariantId,
          shopifyVariantId: shopifyImportedVariant.id,
          importedInventoryItem: {
            create: {
              prismaInventoryItemId,
              shopifyInventoryItemId: shopifyImportedVariant.inventoryItem.id,
            },
          },
        };
      }),
    },
  };

  const newImportedProduct = await tx.importedProduct.create({
    data: prismaData,
  });
  return newImportedProduct;
}

async function handlePartnership(
  tx: Prisma.TransactionClient,
  retailerId: string,
  supplierId: string,
  priceListId: string,
) {
  const partnershipExists = await isSupplierRetailerPartnered(
    retailerId,
    supplierId,
  );

  if (partnershipExists) {
    const partnership = await getSupplierRetailerPartnership(
      retailerId,
      supplierId,
    );
    await addPriceListToPartnershipTx(tx, partnership.id, priceListId);
  } else {
    const partnershipRequestExists = await hasPartnershipRequest(
      priceListId,
      supplierId,
      PARTNERSHIP_REQUEST_TYPE.RETAILER,
    );
    if (partnershipRequestExists) {
      const partnershipRequest = await getPartnershipRequest(
        priceListId,
        retailerId,
        PARTNERSHIP_REQUEST_TYPE.RETAILER,
      );
      await deletePartnershipRequestTx(tx, partnershipRequest.id);
    }
    await createPartnershipsTx(tx, [
      {
        retailerId,
        supplierId,
        message: 'Retailer partnered by importing a product',
        priceListIds: [priceListId],
      },
    ]);
  }
}

async function createShopifyProduct(
  shopifyProductId: string,
  supplierSession: Session,
  supplierName: string,
  graphql: GraphQL,
) {
  const shopifyProductCreationInput =
    await getProductAndMediaCreationInputWithAccessToken(
      shopifyProductId,
      supplierSession.shop,
      supplierSession.accessToken,
      supplierName,
    );

  const newProduct = await createProduct(
    shopifyProductCreationInput.productInputFields,
    shopifyProductCreationInput.mediaInputFields,
    graphql,
  );
  return newProduct;
}

// helper functions for creating shopify variants on retailer's store
async function getSupplierShopifyVariantDetails(
  supplierShopifyVariantIds: string[],
  supplierSession: Session,
) {
  const queryStr = getQueryStr(supplierShopifyVariantIds);
  const numVariants = supplierShopifyVariantIds.length;
  const variantShopifyData =
    await queryExternalStoreAdminAPI<VariantCreationInformationQuery>(
      supplierSession.shop,
      supplierSession.accessToken,
      VARIANT_CREATION_DETAILS_BULK_QUERY,
      {
        query: queryStr,
        first: numVariants,
      },
    );
  return variantShopifyData;
}

// TODO: handle variants that have multiple images
async function getRetailerVariantCreationINput(
  supplierVariants: AllProductDetails['variants'],
  supplierSession: Session,
  supplierName: string,
  shopifyLocationId: string,
) {
  const shopifyVariantIds = supplierVariants.map(
    ({ shopifyVariantId }) => shopifyVariantId,
  );
  const supplierShopifyVariantDetails = await getSupplierShopifyVariantDetails(
    shopifyVariantIds,
    supplierSession,
  );

  const shopifyVariantIdToPrismaData = createMapIdToRestObj(
    supplierVariants,
    'shopifyVariantId',
  );
  // sometimes the query field doesn't match the mutation field,
  // so there are some fields that have to be mapped manually
  const variantsBulkInput =
    supplierShopifyVariantDetails.productVariants.edges.map(
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
          ? `SynqSell ${supplierName} ${inventoryItem.sku}`
          : `SynqSell ${supplierName} ${uuid()}`;

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
          optionValues: selectedOptions.map((option) => ({
            name: option.value,
            optionName: option.name,
          })),
          price: prismaData.retailPrice,
        };
      },
    );

  return variantsBulkInput;
}

async function createShopifyVariants(
  variants: AllProductDetails['variants'],
  supplierSession: Session,
  supplierName: string,
  shopifyLocationId: string,
  retailerNewShopifyProductId: string,
  graphql: GraphQL,
) {
  const retailerVariantCreationInput = await getRetailerVariantCreationINput(
    variants,
    supplierSession,
    supplierName,
    shopifyLocationId,
  );

  const variantsPayload = await createVariants(
    retailerNewShopifyProductId,
    retailerVariantCreationInput,
    graphql,
  );

  return variantsPayload;
}

export async function importProductAction(
  formDataObject: ImportProductFormData,
  sessionId: string,
  graphql: GraphQL,
) {
  try {
    await importProductActionSchema.validate({ formDataObject, sessionId });
    const { productId } = formDataObject;
    const [product, { shopifyLocationId }] = await Promise.all([
      getAllProductDetails(productId),
      userGetFulfillmentService(sessionId),
    ]);
    const priceList = await getPriceList(product.priceListId);
    const [supplierSession, { name: supplierName }] = await Promise.all([
      getSession(priceList.supplierId),
      getProfile(priceList.supplierId),
    ]);

    const retailerNewShopifyProductId = await createShopifyProduct(
      product.shopifyProductId,
      supplierSession,
      supplierName,
      graphql,
    );

    const variantsPayload = await createShopifyVariants(
      product.variants,
      supplierSession,
      supplierName,
      shopifyLocationId,
      retailerNewShopifyProductId,
      graphql,
    );

    await db.$transaction(async (tx) => {
      await Promise.all([
        // if the user imports the product and isn't a partner of the price list, add the user as a partner
        // this allows the supplier to know that the retailer is interested in their products
        handlePartnership(tx, sessionId, supplierSession.id, priceList.id),
        addImportedProductToDatabaseTx(tx, variantsPayload, product, sessionId),
      ]);
    });

    await Promise.all([
      updateChecklistStatus(
        sessionId,
        CHECKLIST_ITEM_KEYS.RETAILER_REQUEST_PARTNERSHIP,
        true,
      ),
      updateChecklistStatus(
        sessionId,
        CHECKLIST_ITEM_KEYS.RETAILER_IMPORT_PRODUCT,
        true,
      ),
    ]);

    return json(
      {
        message: `The product has been successfully imported to your store.`,
        productId: productId,
      },
      { status: StatusCodes.OK },
    );
  } catch (error) {
    logError(error, { sessionId });
    return getRouteError(
      error,
      'Failed to import product. Please try again later.',
    );
  }
}
