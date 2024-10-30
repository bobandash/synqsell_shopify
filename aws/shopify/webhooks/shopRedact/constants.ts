export const ROLES = {
    RETAILER: 'retailer',
    SUPPLIER: 'supplier',
    ADMIN: 'admin',
};
export type RolesOptions = (typeof ROLES)[keyof typeof ROLES];
