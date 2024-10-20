export type ShippingRateRequest = {
    rate: {
        origin: {
            country: string;
            postal_code: string;
            province: string;
            city: string;
            name: string | null;
            address1: string;
            address2: string;
            address3: string | null;
            phone: string | null;
            fax: string | null;
            email: string | null;
            address_type: string | null;
            company_name: string | null;
        };
        destination: {
            country: string;
            postal_code: string;
            province: string;
            city: string;
            name: string | null;
            address1: string;
            address2: string;
            address3: string | null;
            phone: string | null;
            fax: string | null;
            email: string | null;
            address_type: string | null;
            company_name: string | null;
        };
        items: Array<{
            name: string;
            sku: string;
            quantity: number;
            grams: number;
            price: number;
            vendor: string;
            requires_shipping: boolean;
            taxable: boolean;
            fulfillment_service: string;
            properties: unknown | null;
            product_id: number;
            variant_id: number;
        }>;
        currency: string;
        locale: string;
    };
};

export type Session = {
    id: string;
    shop: string;
    state: string;
    isOnline: boolean;
    scope?: string;
    expires?: Date;
    accessToken: string;
    userId?: bigint;
    firstName?: string;
    lastName?: string;
    email?: string;
    accountOwner: boolean;
    locale?: string;
    collaborator?: boolean;
    emailVerified?: boolean;
    storefrontAccessToken?: string;
};

export type BuyerIdentityInput = {
    buyerIdentity: {
        countryCode: string;
        deliveryAddressPreferences: {
            deliveryAddress: {
                address1: string;
                address2?: string;
                city: string;
                country: string;
                province: string;
                zip: string;
            };
        };
    };
};

export type OrderShopifyVariantDetail = {
    id: string;
    quantity: number;
};
