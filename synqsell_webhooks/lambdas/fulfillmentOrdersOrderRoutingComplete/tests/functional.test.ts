import { mockPool, clearAllTables } from '~/integration-setup';
import { initializePool } from '/opt/nodejs/utils';

jest.mock('/opt/nodejs/utils', () => {
    const actualUtil = jest.requireActual('/opt/nodejs/utils');
    return {
        ...actualUtil,
        initializePool: jest.fn(),
        fetchAndValidateGraphQLData: jest.fn().mockImplementation(() => Promise.resolve('')),
        mutateAndValidateGraphQLData: jest.fn().mockImplementation(() => Promise.resolve('Test')),
    };
});
describe('Fulfillment order split and creation in supplier store integration tests', () => {
    beforeEach(async () => {
        jest.clearAllMocks();
        (initializePool as jest.Mock).mockReturnValue(mockPool);
        await clearAllTables();
    }, 30000);

    afterAll(async () => {
        await mockPool.end();
    });
});
