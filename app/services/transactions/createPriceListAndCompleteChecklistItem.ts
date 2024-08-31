import {
  createPriceListTx,
  type CreatePriceListDataProps,
} from '../models/priceList';
import db from '../../db.server';
import { updateChecklistStatusTx } from '../models/checklistStatus';
import { CHECKLIST_ITEM_KEYS } from '~/constants';
import { errorHandler } from '../util';
import type { GraphQL } from '~/types';
import {
  addProductsTx,
  getMapShopifyProductIdToPrismaIdTx,
} from '../models/product';
import { addVariantsTx } from '../helper/variants';

async function createPriceListAndCompleteChecklistItem(
  data: CreatePriceListDataProps,
  sessionId: string,
  graphql: GraphQL,
) {
  const { products } = data;
  const productIdsToAdd = products.map((product) => product.id);

  try {
    const newPriceList = await db.$transaction(async (tx) => {
      await updateChecklistStatusTx(
        tx,
        sessionId,
        CHECKLIST_ITEM_KEYS.SUPPLIER_CREATE_PRICE_LIST,
        true,
      );
      const newPriceList = await createPriceListTx(
        tx,
        data,
        sessionId,
        graphql,
      );
      const priceListId = newPriceList.id;
      await addProductsTx(tx, sessionId, priceListId, productIdsToAdd, graphql);
      const mapShopifyProductIdToPrismaId =
        await getMapShopifyProductIdToPrismaIdTx(
          tx,
          productIdsToAdd,
          priceListId,
        );
      const variantsToAdd = products.flatMap(({ variants, id }) =>
        variants.map((variant) => {
          return {
            ...variant,
            prismaProductId: mapShopifyProductIdToPrismaId.get(id) ?? '',
            variantId: variant.id,
          };
        }),
      );
      await addVariantsTx(tx, variantsToAdd, sessionId, graphql);
      return newPriceList;
    });

    return newPriceList;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to create price list and update checklist item in transaction.',
      createPriceListAndCompleteChecklistItem,
      { data, sessionId },
    );
  }
}

export default createPriceListAndCompleteChecklistItem;
