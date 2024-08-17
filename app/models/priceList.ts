import createHttpError from "http-errors";
import { boolean, number, object, string } from "yup";
import { CHECKLIST_ITEM_KEYS, PRICE_LIST_PRICING_STRATEGY } from "~/constants";
import db from "~/db.server";
import logger from "~/logger";
import { errorHandler, getLogContext } from "~/util";
import { updateChecklistStatusTx } from "./checklistStatus";
import { type Prisma } from "@prisma/client";

type PriceListProps = {
  id: string;
  createdAt: string;
  name: string;
  isGeneral: boolean;
  requiresApprovalToImport?: boolean;
  pricingStrategy: string;
  supplierId: string;
  margin?: number;
};

type CreatePriceListDataProps = {
  margin?: number | undefined;
  requiresApprovalToImport?: boolean | undefined;
  name: string;
  isGeneral: boolean;
  pricingStrategy: string;
};

type PriceListTableInfoProps = {
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
  requiresApprovalToImport: boolean().when("isGeneral", {
    is: true,
    then: (schema) => schema.required(),
    otherwise: (schema) =>
      schema
        .optional()
        .test(
          "is-undefined",
          "Requires approval to import must be undefined when it's a private supplier price list",
          (value) => value === undefined,
        ),
  }),
  pricingStrategy: string().oneOf([
    PRICE_LIST_PRICING_STRATEGY.MARGIN,
    PRICE_LIST_PRICING_STRATEGY.WHOLESALE,
  ]),
  margin: number().when("pricingStrategy", {
    is: PRICE_LIST_PRICING_STRATEGY.MARGIN,
    then: (schema) => schema.required(),
    otherwise: (schema) =>
      schema
        .optional()
        .test(
          "is-undefined",
          "Margin must be undefined when the price list strategy is not based on margin.",
          (value) => value === undefined,
        ),
  }),
});

async function hasGeneralPriceList(sessionId: string) {
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
    const context = getLogContext(hasGeneralPriceList, sessionId);
    throw errorHandler(
      error,
      context,
      "Failed to retrieve general price list.",
    );
  }
}

async function createPriceListTx(
  tx: Prisma.TransactionClient,
  data: CreatePriceListDataProps,
  sessionId: string,
) {
  try {
    const generalPriceListExists = await hasGeneralPriceList(sessionId);
    // A supplier can only have one general price list at a time
    if (generalPriceListExists && data.isGeneral) {
      logger.error(
        `${sessionId} attempted to make multiple general price lists"`,
      );
      throw new createHttpError.BadRequest(
        "You can only have one general price list at once.",
      );
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
    const context = getLogContext(createPriceListTx, tx, data, sessionId);
    throw errorHandler(error, context, "Failed to create price list.");
  }
}

export async function createPriceListAndCompleteChecklistItem(
  data: CreatePriceListDataProps,
  sessionId: string,
) {
  try {
    const newPriceList = await db.$transaction(async (tx) => {
      await updateChecklistStatusTx(
        tx,
        sessionId,
        CHECKLIST_ITEM_KEYS.SUPPLIER_CREATE_PRICE_LIST,
        true,
      );
      const newPriceList = await createPriceListTx(tx, data, sessionId);
      return newPriceList;
    });
    return newPriceList;
  } catch (error) {
    const context = getLogContext(
      createPriceListAndCompleteChecklistItem,
      data,
      sessionId,
    );
    throw errorHandler(
      error,
      context,
      "Failed to create price list and update checklist status.",
    );
  }
}

// retrieves price list information
// TODO: add the amt sold
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
    const context = getLogContext(getPriceListTableInfo, sessionId);
    throw errorHandler(error, context, "Failed to get price list table info.");
  }
}

async function userHasPriceList(sessionId: string, priceListId: string) {
  try {
    const priceList = await db.priceList.findFirstOrThrow({
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
    const context = getLogContext(userHasPriceList, sessionId, priceListId);
    throw errorHandler(error, context, "Failed to get price list.");
  }
}

async function getPriceListDetailedInfo(
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
    const context = getLogContext(
      getPriceListDetailedInfo,
      sessionId,
      priceListId,
    );
    throw errorHandler(
      error,
      context,
      "Failed to get detailed price list info.",
    );
  }
}

// !!! TODO: add the cascade / default values to prevent deleting the price list from deleting reportable information
async function deletePriceListBatch(
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
    const context = getLogContext(
      deletePriceListBatch,
      priceListsIds,
      sessionId,
    );
    throw errorHandler(error, context, "Failed to delete price lists.");
  }
}

export type {
  PriceListProps,
  CreatePriceListDataProps,
  PriceListTableInfoProps,
};

export {
  getPriceListTableInfo,
  userHasPriceList,
  getPriceListDetailedInfo,
  deletePriceListBatch,
};
