export type Event = {
    id: string;
    object: 'event';
    account: string;
    api_version: string;
    created: number;
    data: {
        object: {
            id: string;
            object: 'application';
            name: string;
        };
    };
    livemode: boolean;
    pending_webhooks: number;
    request: {
        id: string | null;
        idempotency_key: string | null;
    };
    type: string;
};
