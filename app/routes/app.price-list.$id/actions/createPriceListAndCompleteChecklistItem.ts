import db from '~/db.server';
import { updateChecklistStatusTx } from '~/services/models/checklistStatus';
import { CHECKLIST_ITEM_KEYS } from '~/constants';
import { errorHandler } from '~/services/util';
import type { GraphQL } from '~/types';
import {
  addProductsTx,
  getMapShopifyProductIdToPrismaIdTx,
} from '~/services/models/product';
import { addVariantsTx } from '~/services/helper/variants';
import { redirect } from '@remix-run/node';
import type { PriceListActionData } from '../types';
import type { Prisma } from '@prisma/client';
import {
  noMoreThanOneGeneralPriceListSchema,
  priceListDataSchema,
} from './schemas';
import { updatePartnershipsInPriceListTx } from './util';

export async function createPriceListTx(
  tx: Prisma.TransactionClient,
  data: PriceListActionData,
  sessionId: string,
) {
  try {
    await priceListDataSchema.validate(data);
    await noMoreThanOneGeneralPriceListSchema.validate({
      sessionId,
      isGeneral: data.settings.isGeneral,
    });
    const { settings } = data;
    const {
      margin,
      requiresApprovalToImport,
      name,
      isGeneral,
      pricingStrategy,
    } = settings;

    const newPriceList = await tx.priceList.create({
      data: {
        name,
        isGeneral,
        ...(requiresApprovalToImport && {
          requiresApprovalToImport,
        }),
        pricingStrategy,
        ...(margin && {
          margin,
        }),
        supplierId: sessionId,
      },
    });

    return newPriceList;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to create price list in transaction.',
      createPriceListTx,
      { data, sessionId },
    );
  }
}

async function createPriceListAndCompleteChecklistItemAction(
  data: PriceListActionData,
  sessionId: string,
  graphql: GraphQL,
) {
  const { products, partnerships } = data;
  const productIdsToAdd = products.map((product) => product.id);
  try {
    const newPriceList = await db.$transaction(async (tx) => {
      await updateChecklistStatusTx(
        tx,
        sessionId,
        CHECKLIST_ITEM_KEYS.SUPPLIER_CREATE_PRICE_LIST,
        true,
      );
      const newPriceList = await createPriceListTx(tx, data, sessionId);
      const priceListId = newPriceList.id;
      await addProductsTx(tx, sessionId, priceListId, productIdsToAdd, graphql);
      await updatePartnershipsInPriceListTx(tx, priceListId, partnerships);

      // logic for adding variants
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

    return redirect(`/app/price-list/${newPriceList.id}?referrer=new`);
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to create price list and update checklist item in transaction.',
      createPriceListAndCompleteChecklistItemAction,
      { data, sessionId },
    );
  }
}

export default createPriceListAndCompleteChecklistItemAction;
