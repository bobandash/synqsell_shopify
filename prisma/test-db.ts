import { PrismaClient } from "@prisma/client";
declare global {
  var testDb: PrismaClient;
}

const testDb: PrismaClient = global.testDb || new PrismaClient();

if (!global.testDb) {
  global.testDb = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });
}

export default testDb;
