import { object, string } from "yup";
import { MODALS } from "../constants";

export const deletePriceListSchema = object({
  intent: string().oneOf([MODALS.DELETE_PRICE_LIST]).required(),
  priceListIds: string()
    .required()
    .test(
      "is-valid-json-array",
      "priceListIds must be a valid JSON array",
      function (value) {
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed);
        } catch (e) {
          return false;
        }
      },
    ),
});
