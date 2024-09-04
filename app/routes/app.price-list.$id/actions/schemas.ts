import { array, boolean, number, object, string } from 'yup';
import { PRICE_LIST_PRICING_STRATEGY, ROLES } from '~/constants';
import {
  hasGeneralPriceList,
  isValidPriceList,
} from '~/services/models/priceList';
import { hasRole } from '~/services/models/roles';

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

// You are not allowed to create more than one general price list
export const noMoreThanOneGeneralPriceListSchema = object({
  isGeneral: boolean().required(),
  sessionId: string().required(),
}).test(
  'max-one-general-price-list',
  'A supplier can only have one general price list at a time.',
  async (values) => {
    const { isGeneral, sessionId } = values;
    const generalPriceListExists = await hasGeneralPriceList(sessionId);
    if (generalPriceListExists && isGeneral) {
      return false;
    }
    return true;
  },
);

export const priceListExistsSchema = string()
  .required()
  .test(
    'is-valid-price-list-id',
    'Price list id does not exist',
    async (value) => {
      return await isValidPriceList(value);
    },
  );

export const isSupplierSchema = string()
  .required()
  .test('is-supplier', 'Session id must be a supplier', async (supplierId) => {
    return await hasRole(supplierId, ROLES.SUPPLIER);
  });
