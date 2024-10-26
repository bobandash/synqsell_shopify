import { object, string } from 'yup';
import { INTENTS, type IntentsProps } from '../constants';
import {
  partnershipIdListSchema,
  partnershipRequestIdListSchema,
  priceListIdListSchema,
} from '~/schemas/models';
import type { Prisma } from '@prisma/client';
import db from '~/db.server';
import { StatusCodes } from 'http-status-codes';
import { createJSONMessage, errorHandler } from '~/lib/utils/server';

export type ChangePermissionsRetailersAction = {
  intent: IntentsProps;
  partnershipIds: string[];
  partnershipRequestIds: string[];
  selectedPriceListIds: string[];
};

// schemas
const updatePartnershipsPriceListPermissionsTxSchema = object({
  partnershipIds: partnershipIdListSchema,
  priceListIds: priceListIdListSchema,
});

const updatePartnershipRequestsPriceListPermissionsTxSchema = object({
  partnershipRequestIds: partnershipRequestIdListSchema,
  priceListIds: priceListIdListSchema,
});

const changePermissionRetailersActionSchema = object({
  intent: string().required().oneOf([INTENTS.CHANGE_PERMISSIONS]),
  partnershipIds: partnershipIdListSchema,
  partnershipRequestIds: partnershipRequestIdListSchema,
  selectedPriceListIds: priceListIdListSchema,
});

async function updatePartnershipsPriceListPermissionsTx(
  tx: Prisma.TransactionClient,
  partnershipIds: string[],
  priceListIds: string[],
) {
  try {
    const priceListIdData = priceListIds.map((id) => ({ id }));
    await updatePartnershipsPriceListPermissionsTxSchema.validate({
      partnershipIds,
      priceListIds,
    });
    const newPartnerships = await Promise.all(
      partnershipIds.map((id) =>
        tx.partnership.update({
          where: { id },
          data: {
            priceLists: {
              set: priceListIdData,
            },
          },
        }),
      ),
    );
    return newPartnerships;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to update price list permissions for partnerships in transaction.',
      updatePartnershipsPriceListPermissionsTx,
      { partnershipIds, priceListIds },
    );
  }
}

async function updatePartnershipRequestsPriceListPermissionsTx(
  tx: Prisma.TransactionClient,
  partnershipRequestIds: string[],
  priceListIds: string[],
) {
  try {
    const priceListIdData = priceListIds.map((id) => ({ id }));

    await updatePartnershipRequestsPriceListPermissionsTxSchema.validate({
      partnershipRequestIds,
      priceListIds,
    });
    const newPartnershipRequests = await Promise.all(
      partnershipRequestIds.map((id) =>
        tx.partnership.update({
          where: { id },
          data: {
            priceLists: {
              set: priceListIdData,
            },
          },
        }),
      ),
    );
    return newPartnershipRequests;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to update price list permissions for partnerships in transaction.',
      updatePartnershipsPriceListPermissionsTx,
      { partnershipRequestIds, priceListIds },
    );
  }
}

export async function changePermissionRetailersAction(
  data: ChangePermissionsRetailersAction,
) {
  await changePermissionRetailersActionSchema.validate(data);
  const { partnershipIds, partnershipRequestIds, selectedPriceListIds } = data;
  await db.$transaction(async (tx) => {
    await Promise.all([
      updatePartnershipsPriceListPermissionsTx(
        tx,
        partnershipIds,
        selectedPriceListIds,
      ),
      updatePartnershipRequestsPriceListPermissionsTx(
        tx,
        partnershipRequestIds,
        selectedPriceListIds,
      ),
    ]);
  });
  return createJSONMessage(
    'Successfully updated price list permissions.',
    StatusCodes.OK,
  );
}
