import { json } from '@remix-run/node';
import * as createHttpError from 'http-errors';
import { StatusCodes } from 'http-status-codes';
import { ValidationError } from 'yup';
import logger from '~/logger';

function getErrorFormat(message: string, statusCode: number) {
  return json(
    {
      error: {
        message: message,
      },
    },
    {
      status: statusCode,
    },
  );
}

function handleRouteError(error: any, route: string) {
  logger.error(error);
  logger.error(`An error occurred at ${route}.`);
  if (error instanceof Response) {
    return error;
  }

  // for yup validation
  if (error instanceof ValidationError) {
    logger.error(`Validation Error: ${error.message}`);
    return getErrorFormat(error.message, StatusCodes.BAD_REQUEST);
  }

  if (error instanceof createHttpError.HttpError) {
    return getErrorFormat(error.message, error.statusCode);
  }

  if (error && 'message' in error) {
    logger.error(error.message);
  }

  if (error instanceof Error) {
    return getErrorFormat(error.message, StatusCodes.INTERNAL_SERVER_ERROR);
  }

  return getErrorFormat(
    'An internal server error occurred. Please contact support.',
    500,
  );
}

export default handleRouteError;
