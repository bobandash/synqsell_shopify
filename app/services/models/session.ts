import { errorHandler } from '../util';
import db from '~/db.server';

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

export async function getSession(sessionId: string) {
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
