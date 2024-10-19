import {
  PrismaClientKnownRequestError,
  PrismaClientRustPanicError,
  PrismaClientUnknownRequestError,
  PrismaClientValidationError,
} from '@prisma/client/runtime/library';
import logger from '~/logger';
import createHttpError from 'http-errors';
import { ValidationError } from 'yup';

type Data = Record<string, any>;

function errorHandler(
  error: unknown,
  humanReadableMessage: string,
  func: (...args: any[]) => any,
  data?: Data,
) {
  const loggedData = {
    function: func.name || 'Anonymous Function',
    ...data,
  };

  if (createHttpError.isHttpError(error)) {
    // avoids redundant logging because majority of generic errors will funnel into isHttpError
    return error;
  } else if (isPrismaError(error)) {
    logger.error(`Prisma error: ${error.message}`, loggedData);
    return convertPrismaToCreateHttpError(error);
  } else if (error instanceof ValidationError) {
    // validation errors are already readable messages
    logger.error(`Validation Error: ${error.message}`, loggedData);
    return new createHttpError.BadRequest(error.message);
  } else if (error instanceof Error) {
    logger.error(error.message, loggedData);
    return new createHttpError.InternalServerError(humanReadableMessage);
  }
  // Case unhandled error
  logger.error(`Unhandled error`);
  return new createHttpError.InternalServerError(humanReadableMessage);
}

function isPrismaError(
  error: unknown,
): error is
  | PrismaClientKnownRequestError
  | PrismaClientUnknownRequestError
  | PrismaClientRustPanicError
  | PrismaClientValidationError {
  return (
    error instanceof PrismaClientKnownRequestError ||
    error instanceof PrismaClientUnknownRequestError ||
    error instanceof PrismaClientRustPanicError ||
    error instanceof PrismaClientValidationError
  );
}

function convertPrismaToCreateHttpError(error: unknown) {
  if (error instanceof PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P1000': // Authentication failed
        return new createHttpError.Unauthorized(
          'Authentication failed. Please check your database credentials.',
        );
      case 'P1003': // Database does not exist at path or server
      case 'P1004': // Database schema does not exist
      case 'P1005': // Database does not exist on server
        return new createHttpError.NotFound(
          'Database not found. Please verify the database configuration.',
        );
      case 'P1009': // Database already exists
        return new createHttpError.BadRequest(
          'The database already exists. Please choose a different name.',
        );
      case 'P1010': // User was denied access
        return new createHttpError.Unauthorized(
          'Access denied. Please check your user permissions.',
        );
      // 408 Request Timeout
      case 'P1002': // Database server timed out
      case 'P1008': // Operations timed out
        return new createHttpError.RequestTimeout(
          'Request timed out. Please try again later.',
        );
      default:
        return new createHttpError.RequestTimeout(
          'An unexpected error occurred. Please try again.',
        );
    }
  } else if (error instanceof PrismaClientUnknownRequestError) {
    return new createHttpError.InternalServerError(
      'An unknown error occurred while processing your request. Please try again.',
    );
  } else if (error instanceof PrismaClientRustPanicError) {
    return new createHttpError.InternalServerError(
      'A critical error occurred with the database. Please contact support.',
    );
  } else if (error instanceof PrismaClientValidationError) {
    return new createHttpError.InternalServerError(
      'Validation error in the database schema. Please review your schema configuration.',
    );
  } else {
    return new Error('An unexpected error occurred. Please try again.');
  }
}

export default errorHandler;
