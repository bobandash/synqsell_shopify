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
import { createJSONSuccess, getRouteError, logError } from '~/lib/utils/server';

export type ChangePermissionsRetailersAction = {
  intent: IntentsProps;
  partnershipIds: string[];
  partnershipRequestIds: string[];
  selectedPriceListIds: string[];
};

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
  const priceListIdData = priceListIds.map((id) => ({ id }));
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
}

async function updatePartnershipRequestsPriceListPermissionsTx(
  tx: Prisma.TransactionClient,
  partnershipRequestIds: string[],
  priceListIds: string[],
) {
  const priceListIdData = priceListIds.map((id) => ({ id }));
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
}

export async function changePermissionRetailersAction(
  data: ChangePermissionsRetailersAction,
) {
  try {
    await changePermissionRetailersActionSchema.validate(data);
    const { partnershipIds, partnershipRequestIds, selectedPriceListIds } =
      data;
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
    return createJSONSuccess(
      'Successfully updated price list permissions.',
      StatusCodes.OK,
    );
  } catch (error) {
    logError(error);
    return getRouteError(
      error,
      'Failed to change retailer permissions. Please try again later.',
    );
  }
}
