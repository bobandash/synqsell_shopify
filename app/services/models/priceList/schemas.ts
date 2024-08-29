import { array, boolean, number, object, string } from 'yup';
import { PRICE_LIST_PRICING_STRATEGY } from '~/constants';
import { isValidPriceList } from '.';

export const priceListDataSchema = object({
  settings: object({
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
    pricingStrategy: string().oneOf(Object.values(PRICE_LIST_PRICING_STRATEGY)),
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
  }),
  products: array().of(
    object({
      id: string().required(),
      variants: array().of(
        object({
          id: string().required(),
          wholesalePrice: number().when('$settings.pricingStrategy', {
            is: PRICE_LIST_PRICING_STRATEGY.WHOLESALE,
            then: (schema) => schema.required(),
            otherwise: (schema) =>
              schema
                .nullable()
                .test(
                  'is-null',
                  'Wholesale price must be null when pricing strategy is not wholesale.',
                  (value) => value === null,
                ),
          }),
        }),
      ),
    }),
  ),
  retailers: array().of(string().required()),
});

export const priceListExistsSchema = string()
  .required()
  .test(
    'is-valid-price-list-id',
    'Price list id does not exist',
    async (value) => {
      return await isValidPriceList(value);
    },
  );
