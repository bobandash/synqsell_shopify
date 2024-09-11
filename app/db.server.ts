import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient;
}

const prisma: PrismaClient = global.prisma || new PrismaClient();
const databaseUrl =
  process.env.NODE_ENV === 'development'
    ? process.env.DEV_DATABASE_URL
    : process.env.DATABASE_URL;

if (process.env.NODE_ENV !== 'production') {
  if (!global.prisma) {
    global.prisma = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
    });
  }
}

export default prisma;
