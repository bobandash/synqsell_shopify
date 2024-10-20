export type Event = {
    id: string;
    object: 'event';
    api_version: string;
    created: number;
    data: {
        object: {
            id: string;
            object: 'payment_method';
            allow_redisplay: 'unspecified' | string;
            billing_details: {
                address: {
                    city: string | null;
                    country: string | null;
                    line1: string | null;
                    line2: string | null;
                    postal_code: string | null;
                    state: string | null;
                };
                email: string | null;
                name: string | null;
                phone: string | null;
            };
            card: {
                brand: string;
                checks: {
                    address_line1_check: string | null;
                    address_postal_code_check: string | null;
                    cvc_check: string | null;
                };
                country: string;
                display_brand: string;
                exp_month: number;
                exp_year: number;
                fingerprint: string;
                funding: string;
                generated_from: string | null;
                last4: string;
                networks: {
                    available: string[];
                    preferred: string | null;
                };
                three_d_secure_usage: {
                    supported: boolean;
                };
                wallet: string | null;
            };
            created: number;
            customer: string | null;
            livemode: boolean;
            metadata: Record<string, any>;
            type: string;
        };
        previous_attributes?: {
            customer: string | null;
        };
    };
    livemode: boolean;
    pending_webhooks: number;
    request: {
        id: string;
        idempotency_key: string;
    };
    type: string;
};
