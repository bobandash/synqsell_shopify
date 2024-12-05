import { v4 as uuidv4 } from 'uuid';
import logger from '~/logger';
import { Prisma } from '@prisma/client';
import { HttpError } from 'http-errors';
// https://medium.com/@psdevraye/best-practices-for-exception-logging-in-spring-boot-real-time-examples-5139607103aa#:~:text=Exception%20Message%3A%20Log%20the%20exception%20message%20itself%2C%20which,the%20exact%20location%20and%20cause%20of%20the%20error.
// ^ always log stack trace
// http://www.blueskyline.com/ErrorPatterns/ErrorPatternsPaper.pdf
// ^ more for microservices, but learned a lot
// https://logging.apache.org/log4j/1.x/manual.html
// ^ when to use difference levels
// Apparently for microservices, technical errors and domain errors are separated
// And if you generate a reference id for microservices (services calling other services), you just use that reference id to log that service
// Reference ids are also good for filtering

function getLogReferenceId() {
  return 'ref-' + uuidv4();
}

function logError(error: unknown, context: string) {
  const referenceId = getLogReferenceId();

  // HTTP Errors are treated as explicitly defined and business logic (e.g. unauthorized to view route; we don't have to log these)
  if (error instanceof HttpError) {
    logger.info({
      referenceId,
      context,
      name: 'HTTPError',
      code: error.statusCode,
      message: error.message,
      stack: error.stack,
    });
    return;
  }

  // For prisma errors, we have to handle differently to not log sensitive info like host name
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    logger.error({
      referenceId,
      context,
      name: 'PrismaError',
      code: error.code,
      message: error.message,
      meta: {
        code: error.code,
        clientVersion: error.clientVersion,
      },
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    logger.error({
      referenceId,
      context,
      name: 'PrismaInitializationError',
      message: error.message,
      clientVersion: error.clientVersion,
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    logger.error({
      referenceId,
      context,
      name: 'PrismaValidationError',
      message: error.message,
    });
    return;
  }

  if (error instanceof Error) {
    logger.error({
      referenceId,
      context,
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
    return;
  }

  logger.error({
    referenceId,
    context,
    name: 'UnhandledError',
    message: error,
    errorType: typeof error,
    errorDetails: {
      isObject: error instanceof Object,
      keys: error instanceof Object ? Object.keys(error) : null,
      stringify: JSON.stringify(error),
      toString: String(error),
    },
  });
}

export default logError;
