import db from '~/db.server';
import { config } from 'dotenv';
import * as path from 'path';

// https://medium.com/@mrk5199/streamlining-prisma-integration-tests-with-jest-a-step-by-step-guide-f6ba53e5030c
config({ path: path.join(__dirname, '../.env.test') });

async function clearDatabase() {
  const tablenames = await db.$queryRaw<
    Array<{ tablename: string }>
  >`SELECT tablename FROM pg_tables WHERE schemaname='public'`;

  const tables = tablenames
    .map(({ tablename }) => tablename)
    .filter((name) => name !== '_prisma_migrations')
    .map((name) => `"public"."${name}"`)
    .join(', ');

  try {
    await db.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
  } catch (error) {
    console.error(error);
  }
}

beforeAll(async () => {
  await clearDatabase();
}, 60000);

afterEach(async () => {
  await clearDatabase();
}, 60000);

afterAll(async () => {
  await db.$disconnect();
});
