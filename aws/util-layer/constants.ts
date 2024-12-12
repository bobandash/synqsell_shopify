export const ROLES = {
  RETAILER: "retailer",
  SUPPLIER: "supplier",
  ADMIN: "admin",
} as const;

export type RolesOptions = (typeof ROLES)[keyof typeof ROLES];
