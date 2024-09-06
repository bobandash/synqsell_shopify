export const INTENTS = {
  IMPORT_PRODUCT: 'IMPORT_PRODUCT',
};

export type IntentsProps = (typeof INTENTS)[keyof typeof INTENTS];
