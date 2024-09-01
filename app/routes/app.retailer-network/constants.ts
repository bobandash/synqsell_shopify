export const PARTNERSHIP_STATUS = {
  PARTNERED: 'PARTNERED',
  REQUESTED_PARTNERSHIP: 'REQUESTED_PARTNERSHIP',
  NO_PARTNERSHIP: 'NO_PARTNERSHIP',
} as const;

export const INTENTS = {
  INITIATE_PARTNERSHIP: 'INITIATE_PARTNERSHIP',
} as const;

export const MODALS = {
  INITIATE_PARTNERSHIP: 'INITIATE_PARTNERSHIP',
};

export type PartnershipStatusProps =
  (typeof PARTNERSHIP_STATUS)[keyof typeof PARTNERSHIP_STATUS];
export type IntentsProps = (typeof INTENTS)[keyof typeof INTENTS];
export type ModalsProps = (typeof MODALS)[keyof typeof MODALS];
