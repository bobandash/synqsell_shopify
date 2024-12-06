import db from '~/db.server';
import { clearDatabase } from '../prisma/test-seed';
import { config } from 'dotenv';
import * as path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';

// https://medium.com/@mrk5199/streamlining-prisma-integration-tests-with-jest-a-step-by-step-guide-f6ba53e5030c
config({ path: path.join(__dirname, '../.env.test') });

beforeAll(async () => {
  await promisify(exec)('npx prisma db push --accept-data-loss');
  await clearDatabase();
}, 60000);

afterAll(async () => {
  await db.$disconnect();
});
