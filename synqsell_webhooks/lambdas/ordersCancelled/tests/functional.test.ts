import { lambdaHandler } from '../app';
import { mockPool, clearAllTables } from '~/integration-setup';
import { initializePool } from '/opt/nodejs/utils';

import '@types/jest';

jest.mock('/opt/nodejs/utils', () => {
    const actualUtil = jest.requireActual('/opt/nodejs/utils');
    return {
        ...actualUtil,
        initializePool: jest.fn(),
        fetchAndValidateGraphQLData: jest.fn().mockImplementation(() => Promise.resolve('')),
        mutateAndValidateGraphQLData: jest.fn().mockImplementation(() => Promise.resolve('Test')),
    };
});

const deleteProductPayload = (payload: any) => {
    return {
        version: '0',
        id: 'abcd1234-5678-90ef-gh12-3456789ijklm',
        'detail-type': 'Shopify Topic',
        source: 'shopify.com/webhooks',
        account: '123456789012',
        time: '2023-08-15T12:34:56Z',
        region: 'us-east-1',
        resources: [],
        detail: {
            'X-Shopify-Topic': 'products/delete',
            'X-Shopify-Hmac-Sha256': 'hmac_value',
            'X-Shopify-Shop-Domain': 'example.myshopify.com',
            'X-Shopify-Webhook-Id': 'webhook_id',
            'X-Shopify-Triggered-At': '2024-08-15T12:34:56Z',
            'X-Shopify-Event-Id': 'event_id',
            payload: { todo: 'add payload' },
        },
    };
};

describe('Delete Products Lambda Function Integration Tests', () => {
    beforeEach(async () => {
        jest.clearAllMocks();
        (initializePool as jest.Mock).mockReturnValue(mockPool);
        await clearAllTables();
    }, 30000);

    afterAll(async () => {
        await mockPool.end();
    });
});
