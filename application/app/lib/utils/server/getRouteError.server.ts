import { Prisma } from '@prisma/client';
import * as createHttpError from 'http-errors';
import { StatusCodes } from 'http-status-codes';
import { ValidationError } from 'yup';
import createJSONError from './createJSONError.server';

function getRouteError(error: any, humanReadableMessage?: string) {
  const defaultMessage =
    'An internal server error occurred. Please contact support.';

  // We do not want to show anything related to database for prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return createJSONError(defaultMessage, StatusCodes.CONFLICT);
      case 'P2025':
        return createJSONError(defaultMessage, StatusCodes.NOT_FOUND);
      default:
        return createJSONError(
          defaultMessage,
          StatusCodes.INTERNAL_SERVER_ERROR,
        );
    }
  }

  // Specific errors with Yup and createHttpError should automatically have humanReadableMessages
  if (error instanceof ValidationError) {
    return createJSONError(error.message, StatusCodes.BAD_REQUEST);
  }

  if (error instanceof createHttpError.HttpError) {
    return createJSONError(error.message, error.statusCode);
  }

  if (error instanceof Error) {
    return createJSONError(
      humanReadableMessage ?? error.message,
      StatusCodes.INTERNAL_SERVER_ERROR,
    );
  }

  return createJSONError(
    humanReadableMessage ?? defaultMessage,
    StatusCodes.INTERNAL_SERVER_ERROR,
  );
}

export default getRouteError;
