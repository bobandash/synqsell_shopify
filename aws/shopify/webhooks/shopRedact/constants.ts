export const ROLES = {
    RETAILER: 'retailer',
    SUPPLIER: 'supplier',
    ADMIN: 'admin',
};
export type RolesOptionsProps = (typeof ROLES)[keyof typeof ROLES];
