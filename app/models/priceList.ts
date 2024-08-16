import createHttpError from "http-errors";
import { boolean, number, object, string } from "yup";
import { CHECKLIST_ITEM_KEYS, PRICE_LIST_PRICING_STRATEGY } from "~/constants";
import db from "~/db.server";
import logger from "~/logger";
import { errorHandler, getLogContext } from "~/util";
import { updateChecklistStatusTx } from "./checklistStatus";
import { type Prisma } from "@prisma/client";

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
    const context = getLogContext(getPriceListTableInfo, sessionId);
    throw errorHandler(error, context, "Failed to get price list table info.");
  }
}

// model Product {
//   id              String            @id @default(uuid())
//   title           String
//   images          String[]
//   description     String
//   price           String
//   PriceList       PriceList         @relation(fields: [priceListId], references: [id])
//   priceListId     String
//   wholesalePrice  Int?
//   ImportedProduct ImportedProduct[]
// }

// model PriceList {
//   id                       String              @id @default(uuid())
//   createdAt                DateTime            @default(now())
//   name                     String
//   isGeneral                Boolean // There can only be one general price list, this is what products are visible on the products page
//   requiresApprovalToImport Boolean? // if the price list is a general price list, suppliers can decide whether or not retailers have to request permission to import their products
//   pricingStrategy          String
//   Session                  Session             @relation(fields: [supplierId], references: [id])
//   supplierId               String
//   margin                   Int?
//   Product                  Product[]
//   PriceListRetailer        PriceListRetailer[]
// }

// // Keeps track of the retailers in the price list
// model PriceListRetailer {
//   id          String    @id @default(uuid())
//   PriceList   PriceList @relation(fields: [priceListId], references: [id])
//   priceListId String
//   Session     Session   @relation(fields: [retailerId], references: [id])
//   retailerId  String
// }

// model Product {
//   id              String            @id @default(uuid())
//   title           String
//   images          String[]
//   description     String
//   price           String
//   PriceList       PriceList         @relation(fields: [priceListId], references: [id])
//   priceListId     String
//   wholesalePrice  Int?
//   ImportedProduct ImportedProduct[]
// }

// model ImportedProduct {
//   id                         String                       @id @default(uuid())
//   Product                    Product                      @relation(fields: [productId], references: [id])
//   productId                  String
//   Session                    Session                      @relation(fields: [retailerId], references: [id])
//   retailerId                 String
//   importedAt                 DateTime                     @default(now())
//   ImportedProductTransaction ImportedProductTransaction[]
// }

// model ImportedProductTransaction {
//   id                String          @id @default(uuid())
//   ImportedProduct   ImportedProduct @relation(fields: [importedProductId], references: [id])
//   importedProductId String
//   createdAt         DateTime
//   fulfilledAt       DateTime
//   unitSales         Int
// }
