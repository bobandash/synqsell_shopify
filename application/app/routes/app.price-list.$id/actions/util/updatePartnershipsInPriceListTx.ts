import type { Prisma } from '@prisma/client';
async function updatePartnershipsInPriceListTx(
  tx: Prisma.TransactionClient,
  priceListId: string,
  partnerships: string[],
) {
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
}

export default updatePartnershipsInPriceListTx;
