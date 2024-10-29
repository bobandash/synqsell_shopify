export const ROLES = {
  RETAILER: 'retailer',
  SUPPLIER: 'supplier',
  ADMIN: 'admin',
};

export const PLANS = {
  BASIC_PLAN: 'Basic Plan',
} as const;

export const ACCESS_REQUEST_STATUS = {
  REJECTED: 'rejected',
  PENDING: 'pending',
  APPROVED: 'approved',
} as const;

export const CHECKLIST_ITEM_KEYS = {
  RETAILER_GET_STARTED: 'retailer_get_started',
  RETAILER_CUSTOMIZE_PROFILE: 'retailer_customize_profile',
  RETAILER_ADD_PAYMENT_METHOD: 'retailer_add_payment_method',
  RETAILER_REQUEST_PARTNERSHIP: 'retailer_request_partnership',
  RETAILER_IMPORT_PRODUCT: 'retailer_import_product',
  SUPPLIER_GET_STARTED: 'supplier_get_started',
  SUPPLIER_CUSTOMIZE_PROFILE: 'supplier_customize_profile',
  SUPPLIER_ADD_PAYMENT_METHOD: 'supplier_add_payment_method',
  SUPPLIER_MANAGE_ZONES: 'supplier_manage_zones',
  SUPPLIER_CREATE_PRICE_LIST: 'supplier_create_price_list',
  SUPPLIER_EXPLORE_NETWORK: 'supplier_explore_network',
} as const;

// constants that have to do with price list
export const PRICE_LIST_CATEGORY = {
  GENERAL: 'GENERAL',
  PRIVATE: 'PRIVATE',
} as const;

export const PRICE_LIST_IMPORT_SETTINGS = {
  NO_APPROVAL: 'NO_APPROVAL',
  APPROVAL: 'APPROVAL',
} as const;

export const PRICE_LIST_PRICING_STRATEGY = {
  WHOLESALE: 'WHOLESALE',
  MARGIN: 'MARGIN',
} as const;

export const FULFILLMENT_SERVICE = {
  name: 'SynqSell',
  callbackUrl: 'https://smth.synqsell.com',
} as const;

// supplier means supplier made request to retailer
// retailer means retailer made request for partnership to supplier
export const PARTNERSHIP_REQUEST_TYPE = {
  SUPPLIER: 'SUPPLIER',
  RETAILER: 'RETAILER',
} as const;

export const PARTNERSHIP_REQUEST_STATUS = {
  REJECTED: 'REJECTED',
  PENDING: 'PENDING',
} as const;

export const ORDER_PAYMENT_STATUS = {
  INCOMPLETE: 'INCOMPLETE',
  PARTIALLY_PAID: 'PARTIALLY_PAID',
  PAID: 'PAID',
} as const;

// TODO: put this in types.ts
export type PlanOptions = (typeof PLANS)[keyof typeof PLANS];

export type RolesOptionsProps = (typeof ROLES)[keyof typeof ROLES];

export type AccessRequestStatusOptionsProps =
  (typeof ACCESS_REQUEST_STATUS)[keyof typeof ACCESS_REQUEST_STATUS];

export type ChecklistItemKeysOptionsProps =
  (typeof CHECKLIST_ITEM_KEYS)[keyof typeof CHECKLIST_ITEM_KEYS];

export type PriceListCategoryOptionsProps =
  (typeof PRICE_LIST_CATEGORY)[keyof typeof PRICE_LIST_CATEGORY];

export type PriceListImportSettingsOptionsProps =
  (typeof PRICE_LIST_IMPORT_SETTINGS)[keyof typeof PRICE_LIST_IMPORT_SETTINGS];

export type PriceListPricingStrategyOptionProps =
  (typeof PRICE_LIST_PRICING_STRATEGY)[keyof typeof PRICE_LIST_PRICING_STRATEGY];

export type PartnershipRequestTypeProps =
  (typeof PARTNERSHIP_REQUEST_TYPE)[keyof typeof PARTNERSHIP_REQUEST_TYPE];

export type OrderPaymentStatusProps =
  (typeof ORDER_PAYMENT_STATUS)[keyof typeof ORDER_PAYMENT_STATUS];

export type PartnershipRequestStatusProps =
  (typeof PARTNERSHIP_REQUEST_STATUS)[keyof typeof PARTNERSHIP_REQUEST_STATUS];

export const CARRIER_SERVICE_NAME = 'SynqSell';
