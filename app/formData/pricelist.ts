// Stores types and choices related to price list form data
import { type ChoiceListProps } from "@shopify/polaris";
import {
  PRICE_LIST_CATEGORY,
  PRICE_LIST_IMPORT_SETTINGS,
  PRICE_LIST_PRICING_STRATEGY,
} from "~/constants";

const categoryChoices: ChoiceListProps["choices"] = [
  {
    label: "General",
    value: PRICE_LIST_CATEGORY.GENERAL,
    helpText: "Products visible to all retailers within the retailer network.",
  },
  {
    label: "Private",
    value: PRICE_LIST_CATEGORY.PRIVATE,
    helpText: "Accessible only to authorized retailers with granted access.",
  },
];

const generalPriceListImportSettingChoices: ChoiceListProps["choices"] = [
  {
    label: "No Approval",
    value: PRICE_LIST_IMPORT_SETTINGS.NO_APPROVAL,
    helpText:
      "Allow any retailers from the retailer network to import products from the general price list without approval.",
  },
  {
    label: "Requires Approval",
    value: PRICE_LIST_IMPORT_SETTINGS.APPROVAL,
    helpText:
      "Prohibit retailers from importing products from the general price list unless you accept their retailer request.",
  },
];

const pricingStrategyChoices: ChoiceListProps["choices"] = [
  {
    label: "Margin",
    value: PRICE_LIST_PRICING_STRATEGY.MARGIN,
    helpText:
      "Retailer who imports your products gets a percentage of the retail price when they make a sale.",
  },
  {
    label: "Wholesale Price",
    value: PRICE_LIST_PRICING_STRATEGY.WHOLESALE,
    helpText:
      "Retailer who imports your product gets the difference between the retail price and wholesale price when they make a sale.",
  },
];

// !!! TODO: In the future (not urgent) - constrain fields to certain values for full benefit of typescript
type PriceListStrategyProps =
  (typeof PRICE_LIST_PRICING_STRATEGY)[keyof typeof PRICE_LIST_PRICING_STRATEGY];

export type { PriceListStrategyProps };

export {
  categoryChoices,
  generalPriceListImportSettingChoices,
  pricingStrategyChoices,
};
