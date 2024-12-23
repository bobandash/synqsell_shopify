export type ShopifyEvent = {
    version: string;
    id: string;
    'detail-type': string;
    source: string;
    account: string;
    time: string;
    region: string;
    resources: string[];
    detail: {
        metadata: {
            'Content-Type': string;
            'X-Shopify-Topic': string;
            'X-Shopify-Hmac-Sha256': string;
            'X-Shopify-Shop-Domain': string;
            'X-Shopify-Webhook-Id': string;
            'X-Shopify-Triggered-At': string;
            'X-Shopify-Event-Id': string;
        };
        payload: {
            id: number;
            name: string;
            email: string;
            domain: string | null;
            province: string;
            country: string;
            address1: string;
            zip: string;
            city: string;
            source: string | null;
            phone: string;
            latitude: number | null;
            longitude: number | null;
            primary_locale: string;
            address2: string | null;
            created_at: string | null;
            updated_at: string | null;
            country_code: string;
            country_name: string;
            currency: string;
            customer_email: string;
            timezone: string;
            iana_timezone: string | null;
            shop_owner: string;
            money_format: string;
            money_with_currency_format: string;
            weight_unit: string;
            province_code: string;
            taxes_included: boolean | null;
            auto_configure_tax_inclusivity: boolean | null;
            tax_shipping: boolean | null;
            county_taxes: boolean | null;
            plan_display_name: string;
            plan_name: string;
            has_discounts: boolean;
            has_gift_cards: boolean;
            myshopify_domain: string | null;
            google_apps_domain: string | null;
            google_apps_login_enabled: boolean | null;
            money_in_emails_format: string;
            money_with_currency_in_emails_format: string;
            eligible_for_payments: boolean;
            requires_extra_payments_agreement: boolean;
            password_enabled: boolean | null;
            has_storefront: boolean;
            finances: boolean;
            primary_location_id: number;
            checkout_api_supported: boolean;
            multi_location_enabled: boolean;
            setup_required: boolean;
            pre_launch_enabled: boolean;
            enabled_presentment_currencies: string[];
            marketing_sms_consent_enabled_at_checkout: boolean;
            transactional_sms_disabled: boolean;
        };
    };
};
