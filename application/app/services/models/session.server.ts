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
  const session = await tx.session.findFirstOrThrow({
    where: {
      id: sessionId,
    },
  });
  if (!session || !session.storefrontAccessToken) {
    return false;
  }
  return true;
}

export async function getStorefrontAccessToken(
  sessionId: string,
  tx: Prisma.TransactionClient = db,
) {
  const session = await tx.session.findFirstOrThrow({
    where: {
      id: sessionId,
    },
    select: { storefrontAccessToken: true },
  });

  const storefrontAccessToken = session.storefrontAccessToken;
  if (!storefrontAccessToken) {
    throw new Error(
      `Storefront access token does not exist for session ${sessionId}.`,
    );
  }
  return session.storefrontAccessToken as string;
}

export async function addStorefrontAccessToken(
  sessionId: string,
  storefrontAccessToken: string,
  tx: Prisma.TransactionClient = db,
) {
  const exists = await hasSession(sessionId, tx);
  if (!exists) {
    throw new Error(`Session ${sessionId} does not exist.`);
  }

  return tx.session.update({
    where: { id: sessionId },
    data: { storefrontAccessToken },
  });
}
