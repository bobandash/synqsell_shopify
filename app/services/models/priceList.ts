import createHttpError from 'http-errors';
import { boolean, number, object, string } from 'yup';
import { PRICE_LIST_PRICING_STRATEGY } from '~/constants';
import db from '~/db.server';
import logger from '~/logger';
import { type Prisma } from '@prisma/client';
import { errorHandler } from '../util';

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
  margin?: number | undefined;
  requiresApprovalToImport?: boolean | undefined;
  name: string;
  isGeneral: boolean;
  pricingStrategy: string;
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

// schema to validate data from createPriceList
const validatePriceListDataSchema = object({
  name: string().required(),
  isGeneral: boolean().required(),
  requiresApprovalToImport: boolean().when('isGeneral', {
    is: true,
    then: (schema) => schema.required(),
    otherwise: (schema) =>
      schema
        .optional()
        .test(
          'is-undefined',
          "Requires approval to import must be undefined when it's a private supplier price list",
          (value) => value === undefined,
        ),
  }),
  pricingStrategy: string().oneOf([
    PRICE_LIST_PRICING_STRATEGY.MARGIN,
    PRICE_LIST_PRICING_STRATEGY.WHOLESALE,
  ]),
  margin: number().when('pricingStrategy', {
    is: PRICE_LIST_PRICING_STRATEGY.MARGIN,
    then: (schema) => schema.required(),
    otherwise: (schema) =>
      schema
        .optional()
        .test(
          'is-undefined',
          'Margin must be undefined when the price list strategy is not based on margin.',
          (value) => value === undefined,
        ),
  }),
});

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

export async function createPriceListTx(
  tx: Prisma.TransactionClient,
  data: CreatePriceListDataProps,
  sessionId: string,
) {
  try {
    const generalPriceListExists = await hasGeneralPriceList(sessionId);
    // A supplier can only have one general price list at a time
    if (generalPriceListExists && data.isGeneral) {
      const errorMessage =
        'A user is only allowed have one general price list at once.';
      logger.error(errorMessage, { data, sessionId });
      throw new createHttpError.BadRequest(errorMessage);
    }

    await validatePriceListDataSchema.validate(data);
    const {
      margin,
      requiresApprovalToImport,
      name,
      isGeneral,
      pricingStrategy,
    } = data;

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
