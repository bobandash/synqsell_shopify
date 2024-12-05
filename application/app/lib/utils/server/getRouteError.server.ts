import { Prisma } from '@prisma/client';
import * as createHttpError from 'http-errors';
import { StatusCodes } from 'http-status-codes';
import { ValidationError } from 'yup';
import createJSONError from './createJSONError.server';

function getRouteError(defaultHumanReadableMessage: string, error: any) {
  const internalServerErrorMessage = !defaultHumanReadableMessage
    ? ''
    : defaultHumanReadableMessage.charAt(
          defaultHumanReadableMessage.length - 1,
        ) === '.'
      ? `${defaultHumanReadableMessage} Please refresh or contact support if the problem persists.`
      : `${defaultHumanReadableMessage}. Please refresh or contact support if the problem persists.`;

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return createJSONError(
          defaultHumanReadableMessage,
          StatusCodes.CONFLICT,
        );
      case 'P2025':
        return createJSONError(
          defaultHumanReadableMessage,
          StatusCodes.NOT_FOUND,
        );
      default:
        return createJSONError(
          internalServerErrorMessage,
          StatusCodes.INTERNAL_SERVER_ERROR,
        );
    }
  }

  // override the default human readable message in these cases
  if (error instanceof ValidationError) {
    return createJSONError(error.message, StatusCodes.BAD_REQUEST);
  }

  if (error instanceof createHttpError.HttpError) {
    return createJSONError(error.message, error.statusCode);
  }

  if (error instanceof Error) {
    return createJSONError(
      internalServerErrorMessage,
      StatusCodes.INTERNAL_SERVER_ERROR,
    );
  }

  return createJSONError(
    'An internal server error occurred. Please contact support.',
    StatusCodes.INTERNAL_SERVER_ERROR,
  );
}

export default getRouteError;
