import { type InferType, object, string } from 'yup';
import { INTENTS } from '../constants';
import { productIdSchema, sessionIdSchema } from '~/schemas/models';
import type { GraphQL } from '~/types';
import { json } from '@remix-run/node';
import { StatusCodes } from 'http-status-codes';
import { getJSONError } from '~/util';
import {
  getAllProductDetails,
  type AllProductDetails,
  type ProductWithVariants,
} from '~/services/models/product';
import {
  createProduct,
  getProductAndMediaCreationInputWithAccessToken,
} from '~/services/shopify/products';
import { getSession, type Session } from '~/services/models/session';
import { getPriceList } from '~/services/models/priceList';
import { userGetFulfillmentService } from '~/services/models/fulfillmentService';
import { getProfile } from '~/services/models/userProfile';
import {
  createVariants,
  getVariantCreationInputWithAccessToken,
} from '~/services/shopify/variants';
import type { ProductVariantsBulkCreateMutation } from '~/types/admin.generated';
import { errorHandler } from '~/services/util';
import db from '~/db.server';
import type { Prisma } from '@prisma/client';
import {
  addPriceListToPartnershipTx,
  createPartnershipsTx,
  getSupplierRetailerPartnership,
  isSupplierRetailerPartnered,
} from '~/services/models/partnership';
import {
  deletePartnershipRequestTx,
  getPartnershipRequest,
  hasPartnershipRequest,
} from '~/services/models/partnershipRequest';
import { PARTNERSHIP_REQUEST_TYPE } from '~/constants';

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
  try {
    // TODO: add yup validation
    const productVariantsBulkCreate = importedProduct.productVariantsBulkCreate;
    const shopifyImportedProduct = productVariantsBulkCreate?.product;
    const shopifyImportedVariants = productVariantsBulkCreate?.productVariants;

    const prismaData = {
      prismaProductId: parentProduct.id,
      shopifyProductId: shopifyImportedProduct!.id,
      retailerId,
      importedVariants: {
        create: shopifyImportedVariants?.map(
          (shopifyImportedVariant, index) => {
            const prismaVariantId = parentProduct.variants[index].id;
            const prismaInventoryItemId =
              parentProduct.variants[index].inventoryItem!.id;
            return {
              prismaVariantId,
              shopifyVariantId: shopifyImportedVariant.id,
              importedInventoryItem: {
                create: {
                  prismaInventoryItemId,
                  shopifyInventoryItemId:
                    shopifyImportedVariant.inventoryItem.id,
                },
              },
            };
          },
        ),
      },
    };

    const newImportedProduct = await tx.importedProduct.create({
      data: prismaData,
    });
    return newImportedProduct;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to add imported product to database',
      addImportedProductToDatabaseTx,
      {
        importedProduct,
        parentProduct,
      },
    );
  }
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

async function createShopifyVariants(
  variants: AllProductDetails['variants'],
  supplierSession: Session,
  supplierName: string,
  shopifyLocationId: string,
  retailerNewShopifyProductId: string,
  graphql: GraphQL,
) {
  const shopifyVariantCreationInput =
    await getVariantCreationInputWithAccessToken(
      variants,
      supplierSession,
      supplierName,
      shopifyLocationId,
    );

  const variantsPayload = await createVariants(
    retailerNewShopifyProductId,
    shopifyVariantCreationInput,
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
    // if the user imports the product and isn't a partner of the price list, add the user as a partner
    // this allows the supplier to know that the retailer is interested in their products
    await db.$transaction(async (tx) => {
      await handlePartnership(tx, sessionId, supplierSession.id, priceList.id);
      await addImportedProductToDatabaseTx(
        tx,
        variantsPayload,
        product,
        sessionId,
      );
    });

    return json(
      {
        message: `The product has been successfully imported to your store.`,
        productId: productId,
      },
      { status: StatusCodes.OK },
    );
  } catch (error) {
    throw getJSONError(error, 'Price List');
  }
}
