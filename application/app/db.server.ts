import { PrismaClient } from '@prisma/client';
declare global {
  var prisma: PrismaClient;
}

const prisma: PrismaClient = global.prisma || new PrismaClient();

function getDatabaseUrl() {
  if (
    !process.env.USERNAME ||
    !process.env.PASSWORD ||
    !process.env.HOST ||
    !process.env.PORT ||
    !process.env.DATABASE
  ) {
    throw new Error('Missing certain database connection parameters.');
  }
  const databaseUrl = `postgresql://${process.env.USERNAME}:${process.env.PASSWORD}@${process.env.HOST}:${process.env.PORT}/${process.env.DATABASE}`;
  return databaseUrl;
}

if (!global.prisma) {
  const databaseUrl = getDatabaseUrl();
  global.prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });
}

export default prisma;
