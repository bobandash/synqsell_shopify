import { APIGatewayProxyResult } from 'aws-lambda';
import { PoolClient } from 'pg';
import { initializePool } from './db';

export const lambdaHandler = async (event: any): Promise<APIGatewayProxyResult> => {
    // let client: null | PoolClient = null;
    try {
        // const pool = initializePool();
        // client = await pool.connect();
        console.log(event);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Successfully did procedure.',
            }),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Could not delete products.',
                error: (error as Error).message,
            }),
        };
    } finally {
        // if (client) {
        //     client.release();
        // }
    }
};
