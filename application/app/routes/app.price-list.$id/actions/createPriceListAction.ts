import db from '~/db.server';
import { updateChecklistStatusTx } from '~/services/models/checklistStatus.server';
import { CHECKLIST_ITEM_KEYS } from '~/constants';
import { getRouteError, logError } from '~/lib/utils/server';
import { addProductsTx } from '~/services/models/product.server';
import type { PriceListActionData } from '../types';
import type { Prisma } from '@prisma/client';
import {
  noMoreThanOneGeneralPriceListSchema,
  priceListDataSchema,
} from './util/schemas';
import { updatePartnershipsInPriceListTx } from './util';
import { addVariantsTx } from '~/services/models/variants.server';
import type { RedirectFunction } from 'node_modules/@shopify/shopify-app-remix/dist/ts/server/authenticate/admin/helpers/redirect';

export async function createPriceListTx(
  tx: Prisma.TransactionClient,
  data: PriceListActionData,
  sessionId: string,
) {
  await noMoreThanOneGeneralPriceListSchema.validate({
    sessionId,
    isGeneral: data.settings.isGeneral,
  });
  const { settings } = data;
  const { margin, requiresApprovalToImport, name, isGeneral, pricingStrategy } =
    settings;

  const newPriceList = await tx.priceList.create({
    data: {
      name,
      isGeneral,
      ...(requiresApprovalToImport !== undefined && {
        requiresApprovalToImport,
      }),
      pricingStrategy,
      ...(margin !== undefined && {
        margin,
      }),
      supplierId: sessionId,
    },
  });

  return newPriceList;
}

async function createPriceListAndCompleteChecklistItemAction(
  data: PriceListActionData,
  sessionId: string,
  redirect: RedirectFunction,
) {
  try {
    await priceListDataSchema.validate(data);
    const { products, partnerships } = data;
    const shopifyProductIdsToAdd = products.map(
      (product) => product.shopifyProductId,
    );

    const newPriceList = await db.$transaction(async (tx) => {
      await updateChecklistStatusTx(
        tx,
        sessionId,
        CHECKLIST_ITEM_KEYS.SUPPLIER_CREATE_PRICE_LIST,
        true,
      );
      const newPriceList = await createPriceListTx(tx, data, sessionId);
      const priceListId = newPriceList.id;
      await updatePartnershipsInPriceListTx(tx, priceListId, partnerships);
      const newProducts = await addProductsTx(
        tx,
        priceListId,
        shopifyProductIdsToAdd,
      );
      const variantsToAdd = products.flatMap(({ variants }, index) =>
        variants.map((variant) => ({
          ...variant,
          productId: newProducts[index].id,
        })),
      );
      await addVariantsTx(tx, variantsToAdd);
      return newPriceList;
    });
    return redirect(`/app/price-list/${newPriceList.id}?referrer=new`);
  } catch (error) {
    logError(error, { sessionId });
    return getRouteError(
      error,
      'Failed to create list. Please try again later.',
    );
  }
}

export default createPriceListAndCompleteChecklistItemAction;
