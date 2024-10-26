import { PrismaClient } from '@prisma/client';
import { errorHandler, getSecrets } from './lib/utils/server';

type DatabaseUserCredentials = {
  password: string;
  username: string;
};
type DatabaseConnection = {
  database: string;
  host: string;
  port: string;
};

declare global {
  var prisma: PrismaClient;
}

const prisma: PrismaClient = global.prisma || new PrismaClient();

async function getProductionDatabaseUrl() {
  try {
    const dbUserCredentialsArn =
      process.env.DATABASE_USER_CREDENTIALS_ARN ?? '';
    const dbConnectionArn = process.env.DATABASE_CONNECTION_ARN ?? '';
    const [userCredentialSecrets, dbConnectionSecrets] = await Promise.all([
      getSecrets<DatabaseUserCredentials>(dbUserCredentialsArn),
      getSecrets<DatabaseConnection>(dbConnectionArn),
    ]);
    const { username, password } = userCredentialSecrets;
    const { host, port, database } = dbConnectionSecrets;
    const databaseUrl = `postgresql://${username}:${password}@${host}:${port}/${database}`;
    return databaseUrl;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to get production database url.',
      getProductionDatabaseUrl,
    );
  }
}

function getDevelopmentDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('Failed to get development database url.');
  }
  return databaseUrl;
}

async function getDatabaseUrl() {
  if (process.env.NODE_ENV === 'development') {
    return getDevelopmentDatabaseUrl();
  } else if (process.env.NODE_ENV === 'production') {
    return await getProductionDatabaseUrl();
  }
  throw new Error(
    'Unhandled. Environment is not valid for retrieving database url.',
  );
}

if (!global.prisma) {
  getDatabaseUrl().then((databaseUrl) => {
    global.prisma = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
    });
  });
}

export default prisma;
