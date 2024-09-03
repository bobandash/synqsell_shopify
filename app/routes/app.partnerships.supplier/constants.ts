export const SUPPLIER_ACCESS_REQUEST_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
};
export type SupplierAccessRequestStatusProps =
  (typeof SUPPLIER_ACCESS_REQUEST_STATUS)[keyof typeof SUPPLIER_ACCESS_REQUEST_STATUS];

export const MODALS = {
  MESSAGE: 'MESSAGE',
};

export type ModalsProps = (typeof MODALS)[keyof typeof MODALS];
