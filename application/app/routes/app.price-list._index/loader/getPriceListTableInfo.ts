import { errorHandler } from '~/services/util';
import type { PriceListTableInfoProps } from '../types';
import db from '~/db.server';

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
        orderLineItems: {
          select: {
            retailPricePerUnit: true,
            quantity: true,
          },
        },
      },
    });

    const priceListInfoFormatted = priceListsInfo.map(
      ({ _count, orderLineItems, ...priceListInfo }) => {
        const sales = orderLineItems.reduce((acc, lineItem) => {
          const itemSales =
            Number(lineItem.retailPricePerUnit) * lineItem.quantity;
          return acc + itemSales;
        }, 0);

        return {
          ...priceListInfo,
          numProducts: _count.products,
          numRetailers: _count.partnerships,
          sales,
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
