import { type InferType, object, string } from 'yup';
import { INTENTS } from '../constants';
import {
  fulfillmentServiceIdSchema,
  productIdSchema,
  sessionIdSchema,
} from '~/schemas/models';
import type { GraphQL } from '~/types';
import { json } from '@remix-run/node';
import { StatusCodes } from 'http-status-codes';
import { getJSONError } from '~/util';
import {
  getAllProductDetails,
  type ProductWithVariants,
} from '~/services/models/product';
import {
  createProduct,
  getProductAndMediaCreationInputWithAccessToken,
} from '~/services/shopify/products';
import { getSession } from '~/services/models/session';
import { getPriceList } from '~/services/models/priceList';
import { getFulfillmentService } from '~/services/models/fulfillmentService';
import { getProfile } from '~/services/models/userProfile';
import {
  createVariants,
  getVariantCreationInputWithAccessToken,
} from '~/services/shopify/variants';
import type { ProductVariantsBulkCreateMutation } from '~/types/admin.generated';
import { errorHandler } from '~/services/util';
import db from '~/db.server';

export type ImportProductFormData = InferType<typeof formDataObjectSchema>;

const formDataObjectSchema = object({
  intent: string().oneOf([INTENTS.IMPORT_PRODUCT]).required(),
  productId: productIdSchema,
  fulfillmentServiceId: fulfillmentServiceIdSchema,
});

const importProductActionSchema = object({
  formDataObject: formDataObjectSchema,
  sessionId: sessionIdSchema,
});

export async function addImportedProductToDatabase(
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

    const newImportedProduct = await db.importedProduct.create({
      data: prismaData,
    });
    return newImportedProduct;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to add imported product to database',
      addImportedProductToDatabase,
      {
        importedProduct,
        parentProduct,
      },
    );
  }
}

// !!! TODO: handle images in variants, not that important in MVP though
export async function importProductAction(
  formDataObject: ImportProductFormData,
  sessionId: string,
  graphql: GraphQL,
) {
  try {
    await importProductActionSchema.validate({ formDataObject, sessionId });
    const { productId, fulfillmentServiceId } = formDataObject;
    const [product, fulfillmentService] = await Promise.all([
      getAllProductDetails(productId),
      getFulfillmentService(fulfillmentServiceId),
    ]);

    const priceList = await getPriceList(product.priceListId);

    const [supplierSession, { name: supplierName }] = await Promise.all([
      getSession(priceList.supplierId),
      getProfile(priceList.supplierId),
    ]);

    const shopifyProductCreationInput =
      await getProductAndMediaCreationInputWithAccessToken(
        product.shopifyProductId,
        supplierSession.shop,
        supplierSession.accessToken,
        supplierName,
      );

    const newProduct = await createProduct(
      shopifyProductCreationInput.productInputFields,
      shopifyProductCreationInput.mediaInputFields,
      graphql,
    );

    const shopifyVariantCreationInput =
      await getVariantCreationInputWithAccessToken(
        product.variants,
        supplierSession,
        supplierName,
        fulfillmentService.shopifyLocationId,
      );

    const importedProductPayload = await createVariants(
      newProduct,
      shopifyVariantCreationInput,
      graphql,
    );

    await addImportedProductToDatabase(
      importedProductPayload,
      product,
      sessionId,
    );

    return json(
      { message: `The product has been successfully imported to your store.` },
      StatusCodes.OK,
    );
  } catch (error) {
    throw getJSONError(error, 'Price List');
  }
}
