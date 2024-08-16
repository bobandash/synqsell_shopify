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
