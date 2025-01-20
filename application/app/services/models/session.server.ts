import type { Prisma } from '@prisma/client';
import db from '~/db.server';
export type Session = Prisma.SessionGetPayload<{}>;

export async function hasSession(
  sessionId: string,
  tx: Prisma.TransactionClient = db,
) {
  const count = await tx.session.count({
    where: { id: sessionId },
  });
  return count > 0;
}

export async function getSession(
  sessionId: string,
  tx: Prisma.TransactionClient = db,
) {
  return tx.session.findFirstOrThrow({
    where: { id: sessionId },
  });
}

export async function isAppUninstalled(
  sessionId: string,
  tx: Prisma.TransactionClient = db,
) {
  const { isAppUninstalled } = await tx.session.findFirstOrThrow({
    where: { id: sessionId },
    select: { isAppUninstalled: true },
  });
  return isAppUninstalled;
}

export async function hasStorefrontAccessToken(
  sessionId: string,
  tx: Prisma.TransactionClient = db,
) {
  const count = await tx.session.count({
    where: {
      id: sessionId,
      NOT: { storefrontAccessToken: null },
    },
  });
  return count > 0;
}

export async function getStorefrontAccessToken(
  sessionId: string,
  tx: Prisma.TransactionClient = db,
) {
  const session = await tx.session.findFirstOrThrow({
    where: {
      id: sessionId,
      NOT: { storefrontAccessToken: null },
    },
    select: { storefrontAccessToken: true },
  });
  return session.storefrontAccessToken as string;
}

export async function addStorefrontAccessToken(
  sessionId: string,
  storefrontAccessToken: string,
  tx: Prisma.TransactionClient = db,
) {
  return tx.session.update({
    where: { id: sessionId },
    data: { storefrontAccessToken },
  });
}
