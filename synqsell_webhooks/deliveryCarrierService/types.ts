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