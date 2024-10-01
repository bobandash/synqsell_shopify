import { json } from '@remix-run/node';
import * as createHttpError from 'http-errors';
import { StatusCodes } from 'http-status-codes';
import { ValidationError } from 'yup';
import logger from '~/logger';

function getJSONError(error: unknown, route: string) {
  if (error instanceof Response) {
    return error;
  }

  if (error instanceof ValidationError) {
    logger.error(`Validation Error: ${error.message}`);
    return json(
      { message: error.message },
      {
        status: StatusCodes.BAD_REQUEST,
      },
    );
  }

  if (error instanceof createHttpError.HttpError) {
    return json(
      { message: error.message },
      {
        status: error.statusCode,
      },
    );
  }

  if (error instanceof Error) {
    return json(
      { message: error.message },
      {
        status: StatusCodes.INTERNAL_SERVER_ERROR,
      },
    );
  }

  logger.error(error);
  logger.error(`An unhandled error occurred at ${route}.`);
  return json(
    {
      message: 'An internal server error occurred. Please contact support.',
    },
    {
      status: 500,
    },
  );
}

export default getJSONError;
