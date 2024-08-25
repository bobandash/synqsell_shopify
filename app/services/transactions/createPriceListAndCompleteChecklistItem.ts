import {
  createPriceListTx,
  type CreatePriceListDataProps,
} from '../models/priceList';
import db from '../../db.server';
import { updateChecklistStatusTx } from '../models/checklistStatus';
import { CHECKLIST_ITEM_KEYS } from '~/constants';
import { errorHandler } from '../util';

async function createPriceListAndCompleteChecklistItem(
  data: CreatePriceListDataProps,
  sessionId: string,
) {
  try {
    const newPriceList = await db.$transaction(async (tx) => {
      await updateChecklistStatusTx(
        tx,
        sessionId,
        CHECKLIST_ITEM_KEYS.SUPPLIER_CREATE_PRICE_LIST,
        true,
      );
      const newPriceList = await createPriceListTx(tx, data, sessionId);
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
