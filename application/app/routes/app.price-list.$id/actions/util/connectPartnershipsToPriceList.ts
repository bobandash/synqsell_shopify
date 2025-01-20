import type { Prisma } from '@prisma/client';
async function connectPartnershipsToPriceList(
  priceListId: string,
  partnerships: string[],
  tx: Prisma.TransactionClient,
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

export default connectPartnershipsToPriceList;
