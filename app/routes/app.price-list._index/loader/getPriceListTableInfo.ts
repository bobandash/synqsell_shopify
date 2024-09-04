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
        products: {
          select: {
            importedProducts: {
              select: {
                importedProductTransactions: {
                  select: {
                    unitSales: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const priceListInfoFormatted = priceListsInfo.map(
      ({ _count, products, ...priceListInfo }) => {
        const totalSales = products.reduce((acc, { importedProducts }) => {
          const productSales = importedProducts.reduce(
            (productAcc, { importedProductTransactions }) => {
              const transactionSales = importedProductTransactions.reduce(
                (transactionAcc, { unitSales }) => {
                  return transactionAcc + unitSales;
                },
                0,
              );
              return productAcc + transactionSales;
            },
            0,
          );
          return acc + productSales;
        }, 0);

        return {
          ...priceListInfo,
          numProducts: _count.products,
          numRetailers: _count.partnerships,
          sales: totalSales,
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
