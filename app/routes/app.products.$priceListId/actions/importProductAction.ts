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
import { getAllProductDetails } from '~/services/models/product';
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

export async function importProductAction(
  formDataObject: ImportProductFormData,
  sessionId: string,
  graphql: GraphQL,
) {
  try {
    await importProductActionSchema.validate({ formDataObject, sessionId });
    const { productId, fulfillmentServiceId } = formDataObject;
    const product = await getAllProductDetails(productId);
    const priceList = await getPriceList(product.priceListId);
    const supplierSession = await getSession(priceList.supplierId);
    const { name: supplierName } = await getProfile(priceList.supplierId);
    const fulfillmentService =
      await getFulfillmentService(fulfillmentServiceId);

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

    const newVariants = await createVariants(
      newProduct,
      shopifyVariantCreationInput,
      graphql,
    );

    // variants: CreateVariant[],
    // createdShopifyProductId: string,
    // shopifyLocationId: string,
    // shop: string,
    // accessToken: string,
    // graphql: GraphQL,

    console.log(newProduct);
    console.log(shopifyProductCreationInput);

    console.log(product);
    console.log(fulfillmentServiceId);
    return json({ message: `Successfully imported products.` }, StatusCodes.OK);
  } catch (error) {
    throw getJSONError(error, 'Price List');
  }
}
