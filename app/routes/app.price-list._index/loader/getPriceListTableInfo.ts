import { errorHandler } from '~/services/util';
import type { PriceListTableInfoProps } from '../types';
import db from '~/db.server';

// TODO: Add sales generates
async function getPriceListTableInfo(
  sessionId: string,
): Promise<PriceListTableInfoProps[]> {
  try {
    const priceListsInfo = await db.priceList.findMany({
      where: { supplierId: sessionId },
      select: {
        id: true,
        name: true,
        isGeneral: true,
        pricingStrategy: true,
        margin: true,
        _count: {
          select: {
            products: true,
            partnerships: true,
          },
        },
      },
    });

    const priceListInfoFormatted = priceListsInfo.map(
      ({ _count, ...priceListInfo }) => {
        return {
          ...priceListInfo,
          numProducts: _count.products,
          numRetailers: _count.partnerships,
          sales: 0,
        };
      },
    );
    return priceListInfoFormatted;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to retrieve price list table information.',
      getPriceListTableInfo,
      { sessionId },
    );
  }
}

export default getPriceListTableInfo;
