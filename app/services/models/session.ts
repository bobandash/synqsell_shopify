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
