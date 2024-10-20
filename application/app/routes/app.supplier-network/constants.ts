export const MODALS = {
  REQUEST_ACCESS_MODAL: 'REQUEST_ACCESS_MODAL',
} as const;

export const INTENTS = {
  REQUEST_ACCESS: 'REQUEST_ACCESS',
};

export const APPROVAL_STATUS = {
  NO_ACCESS_REQUIRED: 'NO_ACCESS_REQUIRED',
  HAS_ACCESS: 'HAS_ACCESS',
  REQUESTED_ACCESS: 'REQUESTED_ACCESS',
  NO_ACCESS: 'NO_ACCESS',
} as const;

export type IntentsProps = (typeof INTENTS)[keyof typeof INTENTS];
export type ModalsProps = (typeof MODALS)[keyof typeof MODALS];
export type ApprovalStatusProps =
  (typeof APPROVAL_STATUS)[keyof typeof APPROVAL_STATUS];
