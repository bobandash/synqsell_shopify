import db from '~/db.server';
import { type Prisma } from '@prisma/client';
import { errorHandler } from '~/services/util';
import { priceListDataSchema } from './schemas';
import type { CoreProductProps } from '~/services/types';
import { type GraphQL } from '~/types';
import { getRelevantProductInformationForPrisma } from '~/services/shopify/products';

export type PriceListProps = {
  id: string;
  createdAt: string;
  name: string;
  isGeneral: boolean;
  requiresApprovalToImport?: boolean;
  pricingStrategy: string;
  supplierId: string;
  margin?: number;
};

export type CreatePriceListDataProps = {
  settings: {
    margin?: number | undefined;
    requiresApprovalToImport?: boolean | undefined;
    name: string;
    isGeneral: boolean;
    pricingStrategy: string;
  };
  products: CoreProductProps[];
  retailers: string[];
};

export type PriceListTableInfoProps = {
  id: string;
  name: string;
  isGeneral: boolean;
  pricingStrategy: string;
  margin: number | null;
  numProducts: number;
  numRetailers: number;
  sales: number;
};

export async function hasGeneralPriceList(sessionId: string) {
  try {
    const generalPriceList = await db.priceList.findFirst({
      where: {
        isGeneral: true,
        supplierId: sessionId,
      },
    });
    if (!generalPriceList) {
      return false;
    }
    return true;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to check whether general price list exists.',
      hasGeneralPriceList,
      { sessionId },
    );
  }
}

export async function updatePriceList(
  priceListId: string,
  data: CreatePriceListDataProps,
  sessionId: string,
  graphql: GraphQL,
) {
  try {
    await priceListDataSchema.validate(data, {
      context: data,
    });
    const { settings, products, retailers } = data;
    const productIds = products.map((product) => product.id);

    const productData = await getRelevantProductInformationForPrisma(
      productIds,
      sessionId,
      graphql,
    );

    const {
      margin,
      requiresApprovalToImport,
      name,
      isGeneral,
      pricingStrategy,
    } = settings;

    const updatedPriceList = await db.priceList.update({
      where: {
        id: priceListId,
      },
      data: {
        name,
        isGeneral,
        ...(requiresApprovalToImport && {
          requiresApprovalToImport,
        }),
        pricingStrategy,
        ...(margin && {
          margin,
        }),
        supplierId: sessionId,
      },
    });
    return updatedPriceList;
  } catch (error) {
    throw errorHandler(error, 'Failed to update price list.', updatePriceList, {
      sessionId,
    });
  }
}

export async function createPriceListTx(
  tx: Prisma.TransactionClient,
  data: CreatePriceListDataProps,
  sessionId: string,
) {
  try {
    await priceListDataSchema.validate(data);
    const { settings, products, retailers } = data;
    const {
      margin,
      requiresApprovalToImport,
      name,
      isGeneral,
      pricingStrategy,
    } = settings;
    // const productData = getProductCreationData(products);

    const newPriceList = await tx.priceList.create({
      data: {
        name,
        isGeneral,
        ...(requiresApprovalToImport && {
          requiresApprovalToImport,
        }),
        pricingStrategy,
        ...(margin && {
          margin,
        }),
        supplierId: sessionId,
      },
    });

    return newPriceList;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to create price list in transaction.',
      createPriceListTx,
      { data, sessionId },
    );
  }
}

// retrieves price list information
// !!! TODO: add the amt sold
export async function getPriceListTableInfo(
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
            Product: true,
            PriceListRetailer: true,
          },
        },
        Product: {
          select: {
            ImportedProduct: {
              select: {
                ImportedProductTransaction: {
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
      ({ _count, Product, ...priceListInfo }) => {
        const totalSales = Product.reduce((acc, { ImportedProduct }) => {
          const productSales = ImportedProduct.reduce(
            (productAcc, { ImportedProductTransaction }) => {
              const transactionSales = ImportedProductTransaction.reduce(
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
          numProducts: _count.Product,
          numRetailers: _count.PriceListRetailer,
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

export async function userHasPriceList(sessionId: string, priceListId: string) {
  try {
    const priceList = await db.priceList.findFirst({
      where: {
        supplierId: sessionId,
        id: priceListId,
      },
    });
    if (priceList) {
      return true;
    }
    return false;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to check if user has price list.',
      getPriceListTableInfo,
      { sessionId },
    );
  }
}

export async function getPriceListDetailedInfo(
  sessionId: string,
  priceListId: string,
) {
  try {
    const priceList = await db.priceList.findFirstOrThrow({
      where: {
        supplierId: sessionId,
        id: priceListId,
      },
      include: {
        Product: true,
      },
    });
    return priceList;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to retrieve price list detailed information.',
      getPriceListTableInfo,
      { sessionId },
    );
  }
}

export async function deletePriceListBatch(
  priceListsIds: string[],
  sessionId: string,
) {
  try {
    const deletedPriceLists = await db.priceList.deleteMany({
      where: {
        id: {
          in: priceListsIds,
        },
        supplierId: sessionId,
      },
    });
    return deletedPriceLists;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to delete price lists in batch.',
      deletePriceListBatch,
      { priceListsIds, sessionId },
    );
  }
}
