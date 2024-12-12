import { Pool } from 'pg';
import { client } from './singletons';
import { GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

type DbUserCredentials = {
    password: string;
    username: string;
};

type DbConnectionValues = {
    database: string;
    host: string;
    port: string;
};

let pool: Pool | null = null;

async function getDbUserCredentials() {
    const response = await client.send(
        new GetSecretValueCommand({
            SecretId: process.env.DB_USER_CREDENTIALS_SECRET_ID ?? '',
        }),
    );
    const secretString = response.SecretString;
    if (!secretString) {
        throw new Error('There are no secrets when retrieving the database user credentials.');
    }
    const dbUserCreds = JSON.parse(secretString);
    return dbUserCreds as DbUserCredentials;
}

async function getDbConnectionValues() {
    const response = await client.send(
        new GetSecretValueCommand({
            SecretId: process.env.DB_CONNECTION_SECRET_ID ?? '',
        }),
    );
    const secretString = response.SecretString;
    if (!secretString) {
        throw new Error('There are no secrets when retrieving the database connection values.');
    }
    const dbConnectionValues = JSON.parse(secretString);
    return dbConnectionValues as DbConnectionValues;
}

async function initializePool() {
    if (!pool) {
        const [dbUserCredentials, dbConnectionValues] = await Promise.all([
            getDbUserCredentials(),
            getDbConnectionValues(),
        ]);

        pool = new Pool({
            user: dbUserCredentials.username,
            host: dbConnectionValues.host,
            database: dbConnectionValues.database,
            password: dbUserCredentials.password,
            port: Number(dbConnectionValues.port),
            max: 20,
            ssl: {
                rejectUnauthorized: false,
            },
        });
    }
    return pool;
}

export { initializePool };
