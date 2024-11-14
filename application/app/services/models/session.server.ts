import type { Prisma } from '@prisma/client';
import db from '~/db.server';
export type Session = Prisma.SessionGetPayload<{}>;

export async function hasSession(sessionId: string) {
  const session = await db.session.findFirst({
    where: {
      id: sessionId,
    },
  });
  if (!session) {
    return false;
  }
  return true;
}

export async function getSession(sessionId: string) {
  const session = await db.session.findFirstOrThrow({
    where: {
      id: sessionId,
    },
  });
  return session;
}

export async function isAppUninstalled(sessionId: string) {
  const res = await db.session.findFirstOrThrow({
    where: {
      id: sessionId,
    },
    select: {
      isAppUninstalled: true,
    },
  });
  return res.isAppUninstalled;
}

export async function hasStorefrontAccessToken(sessionId: string) {
  const session = await db.session.findFirstOrThrow({
    where: {
      id: sessionId,
    },
  });
  if (session.storefrontAccessToken) {
    return true;
  }
  return false;
}

export async function getStorefrontAccessToken(sessionId: string) {
  const storefrontAccessTokenExists = await hasStorefrontAccessToken(sessionId);
  if (!storefrontAccessTokenExists) {
    throw new Error('Storefront access token does not exist.');
  }
  const session = await db.session.findFirstOrThrow({
    where: {
      id: sessionId,
    },
  });
  return session.storefrontAccessToken as string;
}

export async function addStorefrontAccessToken(
  sessionId: string,
  storefrontAccessToken: string,
) {
  await db.session.update({
    where: {
      id: sessionId,
    },
    data: {
      storefrontAccessToken,
    },
  });
}

export async function hasStripeConnectAccount(sessionId: string) {
  const res = await db.session.findFirstOrThrow({
    where: {
      id: sessionId,
    },
    select: {
      stripeConnectAccount: true,
    },
  });

  if (res.stripeConnectAccount) {
    return true;
  }
  return false;
}

// TODO: Consider whether or not to remove this
// even if a stripe customer account exists doesn't mean that there is a payment method
export async function hasStripePaymentsAccount(sessionId: string) {
  const res = await db.session.findFirstOrThrow({
    where: {
      id: sessionId,
    },
    select: {
      stripeCustomerAccount: true,
    },
  });

  if (res.stripeCustomerAccount) {
    return true;
  }
  return false;
}
