export const RETAILER_ACCESS_REQUEST_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
};
export type SupplierAccessRequestStatusProps =
  (typeof RETAILER_ACCESS_REQUEST_STATUS)[keyof typeof RETAILER_ACCESS_REQUEST_STATUS];

export const MODALS = {
  MESSAGE: 'MESSAGE',
};
export type ModalsProps = (typeof MODALS)[keyof typeof MODALS];

export const INTENTS = {
  APPROVE_RETAILERS: 'APPROVE_RETAILERS',
  REJECT_REMOVE_RETAILERS: 'REJECT_REMOVE_RETAILERS',
};

export type IntentsProps = (typeof INTENTS)[keyof typeof INTENTS];
