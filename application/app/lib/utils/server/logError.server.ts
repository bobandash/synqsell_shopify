import logger from '~/logger';
import { Prisma } from '@prisma/client';
import { HttpError } from 'http-errors';
// https://medium.com/@psdevraye/best-practices-for-exception-logging-in-spring-boot-real-time-examples-5139607103aa#:~:text=Exception%20Message%3A%20Log%20the%20exception%20message%20itself%2C%20which,the%20exact%20location%20and%20cause%20of%20the%20error.
// ^ always log stack trace
// http://www.blueskyline.com/ErrorPatterns/ErrorPatternsPaper.pdf
// ^ more for microservices, but learned a lot
// https://logging.apache.org/log4j/1.x/manual.html
// ^ when to use difference levels

function logError(error: unknown, context: any = {}) {
  // HTTP Errors are treated as explicitly defined and business logic (e.g. unauthorized to view route; we don't have to log these)
  if (error instanceof HttpError) {
    logger.info({
      name: 'HTTPError',
      code: error.statusCode,
      message: error.message,
      stack: error.stack,
      ...context,
    });
    return;
  }

  // For prisma errors, we have to handle differently to not log sensitive info like host name
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    logger.error({
      name: 'PrismaError',
      code: error.code,
      message: 'Failed to handle query constraint.',
      ...context,
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    logger.error({
      name: 'PrismaInitializationError',
      message: 'Failed to reach database.',
      clientVersion: error.clientVersion,
      ...context,
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    logger.error({
      name: 'PrismaValidationError',
      message: 'Failed to validate database query parameters.',
      ...context,
    });
    return;
  }

  if (error instanceof Error) {
    logger.error({
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...context,
    });
    return;
  }

  logger.error({
    name: 'UnhandledError',
    message: error,
    errorType: typeof error,
    errorDetails: {
      isObject: error instanceof Object,
      keys: error instanceof Object ? Object.keys(error) : null,
      stringify: JSON.stringify(error),
      toString: String(error),
    },
    ...context,
  });
}

export default logError;
