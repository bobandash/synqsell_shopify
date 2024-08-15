export const ROLES = {
  RETAILER: "retailer",
  SUPPLIER: "supplier",
  ADMIN: "admin",
};

export const ACCESS_REQUEST_STATUS = {
  REJECTED: "rejected",
  PENDING: "pending",
  APPROVED: "approved",
};

export const CHECKLIST_ITEM_KEYS = {
  RETAILER_GET_STARTED: "retailer_get_started",
  RETAILER_CUSTOMIZE_PROFILE: "retailer_customize_profile",
  RETAILER_REQUEST_PARTNERSHIP: "retailer_request_partnership",
  RETAILER_IMPORT_PRODUCT: "retailer_import_product",
  SUPPLIER_GET_STARTED: "supplier_get_started",
  SUPPLIER_CUSTOMIZE_PROFILE: "supplier_customize_profile",
  SUPPLIER_MANAGE_ZONES: "supplier_manage_zones",
  SUPPLIER_CREATE_PRICE_LIST: "supplier_create_price_list",
  SUPPLIER_EXPLORE_NETWORK: "supplier_explore_network",
};

// constants that have to do with price list
export const PRICE_LIST_CATEGORY = {
  GENERAL: "GENERAL",
  PRIVATE: "PRIVATE",
};

export const PRICE_LIST_IMPORT_SETTINGS = {
  NO_APPROVAL: "NO_APPROVAL",
  APPROVAL: "APPROVAL",
};

export const PRICE_LIST_PRICING_STRATEGY = {
  WHOLESALE: "WHOLESALE",
  MARGIN: "MARGIN",
};
