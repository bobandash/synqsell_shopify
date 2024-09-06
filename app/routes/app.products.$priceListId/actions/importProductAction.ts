import { type InferType, object, string } from 'yup';
import { INTENTS } from '../constants';
import {
  productIdSchema,
  sessionIdSchema,
  shopifyFulfillmentServiceIdSchema,
} from '~/schemas/models';
import { createEntireProductShopify } from '~/services/shopify/products';
import { getProductDetailsForProductCreation } from '~/services/models/product';
import type { GraphQL } from '~/types';
import { json } from '@remix-run/node';
import { StatusCodes } from 'http-status-codes';
import { getJSONError } from '~/util';

export type ImportProductFormData = InferType<typeof formDataObjectSchema>;

const formDataObjectSchema = object({
  intent: string().oneOf([INTENTS.IMPORT_PRODUCT]).required(),
  productId: productIdSchema,
  fulfillmentServiceId: shopifyFulfillmentServiceIdSchema,
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
    const productDetails = await getProductDetailsForProductCreation(productId);
    await createEntireProductShopify(
      productDetails,
      fulfillmentServiceId,
      graphql,
    );
    return json({ message: `Successfully imported products.` }, StatusCodes.OK);
  } catch (error) {
    throw getJSONError(error, 'Price List');
  }
}
