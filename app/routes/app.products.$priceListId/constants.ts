export const INTENTS = {
  IMPORT_PRODUCT: 'IMPORT_PRODUCT',
};

export const PRODUCT_STATUS = {
  IMPORTED: 'IMPORTED',
  ACCESS_NOT_IMPORTED: 'ACCESS_NOT_IMPORTED',
  NO_ACCESS_REQUEST: 'NO_ACCESS_REQUEST',
  REQUESTED_ACCESS: 'REQUESTED_ACCESS',
};

export type ProductStatusProps =
  (typeof PRODUCT_STATUS)[keyof typeof PRODUCT_STATUS];
export type IntentsProps = (typeof INTENTS)[keyof typeof INTENTS];
