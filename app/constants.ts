export const ROLES = {
  RETAILER: 'retailer',
  SUPPLIER: 'supplier',
  ADMIN: 'admin',
};

export type RolesOptionsProps = (typeof ROLES)[keyof typeof ROLES];

export const ACCESS_REQUEST_STATUS = {
  REJECTED: 'rejected',
  PENDING: 'pending',
  APPROVED: 'approved',
} as const;

export type AccessRequestStatusOptionsProps =
  (typeof ACCESS_REQUEST_STATUS)[keyof typeof ACCESS_REQUEST_STATUS];

export const CHECKLIST_ITEM_KEYS = {
  RETAILER_GET_STARTED: 'retailer_get_started',
  RETAILER_CUSTOMIZE_PROFILE: 'retailer_customize_profile',
  RETAILER_REQUEST_PARTNERSHIP: 'retailer_request_partnership',
  RETAILER_IMPORT_PRODUCT: 'retailer_import_product',
  SUPPLIER_GET_STARTED: 'supplier_get_started',
  SUPPLIER_CUSTOMIZE_PROFILE: 'supplier_customize_profile',
  SUPPLIER_MANAGE_ZONES: 'supplier_manage_zones',
  SUPPLIER_CREATE_PRICE_LIST: 'supplier_create_price_list',
  SUPPLIER_EXPLORE_NETWORK: 'supplier_explore_network',
} as const;

export type ChecklistItemKeysOptionsProps =
  (typeof CHECKLIST_ITEM_KEYS)[keyof typeof CHECKLIST_ITEM_KEYS];

// constants that have to do with price list
export const PRICE_LIST_CATEGORY = {
  GENERAL: 'GENERAL',
  PRIVATE: 'PRIVATE',
} as const;

export type PriceListCategoryOptionsProps =
  (typeof PRICE_LIST_CATEGORY)[keyof typeof PRICE_LIST_CATEGORY];

export const PRICE_LIST_IMPORT_SETTINGS = {
  NO_APPROVAL: 'NO_APPROVAL',
  APPROVAL: 'APPROVAL',
} as const;

export type PriceListImportSettingsOptionsProps =
  (typeof PRICE_LIST_IMPORT_SETTINGS)[keyof typeof PRICE_LIST_IMPORT_SETTINGS];

export const PRICE_LIST_PRICING_STRATEGY = {
  WHOLESALE: 'WHOLESALE',
  MARGIN: 'MARGIN',
} as const;

export type PriceListPricingStrategyOptionProps =
  (typeof PRICE_LIST_PRICING_STRATEGY)[keyof typeof PRICE_LIST_PRICING_STRATEGY];

export const FULFILLMENT_SERVICE = {
  name: 'SynqSell',
  callbackUrl: 'https://smth.synqsell.com',
} as const;

export const MARKETPLACE_FEE = 0.03;

export const PARTNERSHIP_REQUEST_TYPE = {
  SUPPLIER: 'SUPPLIER',
  RETAILER: 'RETAILER',
} as const;

export type PartnershipRequestTypeProps =
  (typeof PARTNERSHIP_REQUEST_TYPE)[keyof typeof PARTNERSHIP_REQUEST_TYPE];

export const PARTNERSHIP_REQUEST_STATUS = {
  REJECTED: 'REJECTED',
  PENDING: 'PENDING',
} as const;

export type PartnershipRequestStatusProps =
  (typeof PARTNERSHIP_REQUEST_STATUS)[keyof typeof PARTNERSHIP_REQUEST_STATUS];
