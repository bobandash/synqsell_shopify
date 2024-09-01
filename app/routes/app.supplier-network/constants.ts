export const MODALS = {
  REQUEST_ACCESS_MODAL: 'REQUEST_ACCESS_MODAL',
} as const;

export const INTENTS = {
  REQUEST_ACCESS: 'REQUEST_ACCESS',
};

export type IntentsProps = (typeof INTENTS)[keyof typeof INTENTS];
export type ModalsProps = (typeof MODALS)[keyof typeof MODALS];
