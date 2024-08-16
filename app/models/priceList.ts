import { boolean, number, object, string } from "yup";
import { PRICE_LIST_PRICING_STRATEGY } from "~/constants";
import db from "~/db.server";
import { errorHandler, getLogContext } from "~/util";

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

type CreatePriceListDataProps = {
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

export async function createPriceList(
  data: CreatePriceListDataProps,
  sessionId: string,
) {
  try {
    await validatePriceListDataSchema.validate(data);
    const {
      margin,
      requiresApprovalToImport,
      name,
      isGeneral,
      pricingStrategy,
    } = data;

    const newPriceList = await db.priceList.create({
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
    const context = getLogContext(createPriceList, data, sessionId);
    throw errorHandler(error, context, "Failed to create price list.");
  }
}
