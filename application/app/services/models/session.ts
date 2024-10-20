import type { Prisma } from '@prisma/client';
import { errorHandler } from '../util';
import db from '~/db.server';

export type Session = Prisma.SessionGetPayload<{}>;

export async function hasSession(sessionId: string) {
  try {
    const session = await db.session.findFirst({
      where: {
        id: sessionId,
      },
    });
    if (!session) {
      return false;
    }
    return true;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to check if session id exists.',
      hasSession,
      { sessionId },
    );
  }
}

export async function getSession(sessionId: string): Promise<Session> {
  try {
    const session = await db.session.findFirstOrThrow({
      where: {
        id: sessionId,
      },
    });
    return session;
  } catch (error) {
    throw errorHandler(error, 'Failed to get session', getSession, {
      sessionId,
    });
  }
}

export async function isAppUninstalled(sessionId: string) {
  try {
    const res = await db.session.findFirstOrThrow({
      where: {
        id: sessionId,
      },
      select: {
        isAppUninstalled: true,
      },
    });
    return res.isAppUninstalled;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to check if app is uninstalled.',
      isAppUninstalled,
      {
        sessionId,
      },
    );
  }
}

export async function hasStorefrontAccessToken(sessionId: string) {
  try {
    const session = await db.session.findFirstOrThrow({
      where: {
        id: sessionId,
      },
    });
    if (session.storefrontAccessToken) {
      return true;
    }
    return false;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to see if storefront access token exists.',
      hasStorefrontAccessToken,
      {
        sessionId,
      },
    );
  }
}

export async function getStorefrontAccessToken(sessionId: string) {
  try {
    const storefrontAccessTokenExists =
      await hasStorefrontAccessToken(sessionId);
    if (!storefrontAccessTokenExists) {
      throw new Error('Storefront access token does not exist.');
    }
    const session = await db.session.findFirstOrThrow({
      where: {
        id: sessionId,
      },
    });
    return session.storefrontAccessToken as string;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to retrieve storefront access token.',
      getStorefrontAccessToken,
      {
        sessionId,
      },
    );
  }
}

export async function addStorefrontAccessToken(
  sessionId: string,
  storefrontAccessToken: string,
) {
  try {
    await db.session.update({
      where: {
        id: sessionId,
      },
      data: {
        storefrontAccessToken,
      },
    });
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to add storefront access token to database.',
      addStorefrontAccessToken,
      {
        sessionId,
      },
    );
  }
}

export async function hasStripeConnectAccount(sessionId: string) {
  try {
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
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to check if stripe connect account exists.',
      hasStripeConnectAccount,
      {
        sessionId,
      },
    );
  }
}

export async function hasStripePaymentsAccount(sessionId: string) {
  try {
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
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to check if stripe payments account exists.',
      hasStripePaymentsAccount,
      {
        sessionId,
      },
    );
  }
}
