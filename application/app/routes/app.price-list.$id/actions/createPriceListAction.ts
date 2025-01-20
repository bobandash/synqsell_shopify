import db from '~/db.server';
import { updateChecklistStatus } from '~/services/models/checklistStatus.server';
import { CHECKLIST_ITEM_KEYS } from '~/constants';
import { getRouteError, logError } from '~/lib/utils/server';
import { addProducts } from '~/services/models/product.server';
import type { PriceListActionData } from '../types';
import type { Prisma } from '@prisma/client';
import {
  noMoreThanOneGeneralPriceListSchema,
  priceListDataSchema,
} from './util/schemas';
import { addVariants } from '~/services/models/variants.server';
import type { RedirectFunction } from 'node_modules/@shopify/shopify-app-remix/dist/ts/server/authenticate/admin/helpers/redirect';
import { connectPartnershipsToPriceList } from './util';

export async function createPriceList(
  data: PriceListActionData,
  sessionId: string,
  tx: Prisma.TransactionClient = db,
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
      ({ shopifyProductId }) => shopifyProductId,
    );

    const newPriceList = await db.$transaction(async (tx) => {
      await updateChecklistStatus(
        sessionId,
        CHECKLIST_ITEM_KEYS.SUPPLIER_CREATE_PRICE_LIST,
        true,
        tx,
      );
      const newPriceList = await createPriceList(data, sessionId, tx);
      const priceListId = newPriceList.id;
      await connectPartnershipsToPriceList(priceListId, partnerships, tx);
      const newProducts = await addProducts(
        priceListId,
        shopifyProductIdsToAdd,
        tx,
      );
      const variantsToAdd = products.flatMap(({ variants }, index) =>
        variants.map((variant) => ({
          ...variant,
          productId: newProducts[index].id,
        })),
      );
      await addVariants(variantsToAdd, tx);
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
