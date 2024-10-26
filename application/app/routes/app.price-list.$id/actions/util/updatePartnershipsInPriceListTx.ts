import type { Prisma } from '@prisma/client';
import { errorHandler } from '~/lib/utils/server';

async function updatePartnershipsInPriceListTx(
  tx: Prisma.TransactionClient,
  priceListId: string,
  partnerships: string[],
) {
  try {
    const partnershipDataFmt = partnerships.map((id) => {
      return { id };
    });
    const newPriceListPartnerships = await tx.priceList.update({
      where: {
        id: priceListId,
      },
      data: {
        partnerships: {
          set: partnershipDataFmt,
        },
      },
    });
    return newPriceListPartnerships;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to update partnerships in price list.',
      updatePartnershipsInPriceListTx,
      {
        priceListId,
      },
    );
  }
}

export default updatePartnershipsInPriceListTx;
