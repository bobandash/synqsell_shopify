export const SUPPLIER_ACCESS_REQUEST_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
};
export type SupplierAccessRequestStatusProps =
  (typeof SUPPLIER_ACCESS_REQUEST_STATUS)[keyof typeof SUPPLIER_ACCESS_REQUEST_STATUS];

export const MODALS = {
  MESSAGE: 'MESSAGE',
};
export type ModalsProps = (typeof MODALS)[keyof typeof MODALS];

export const INTENTS = {
  APPROVE_SUPPLIERS: 'APPROVE_SUPPLIERS',
  REJECT_REMOVE_SUPPLIERS: 'REJECT_REMOVE_SUPPLIERS',
};

export type IntentsProps = (typeof INTENTS)[keyof typeof INTENTS];
