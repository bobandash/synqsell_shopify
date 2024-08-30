import { json } from '@remix-run/node';
import * as createHttpError from 'http-errors';
import { ValidationError } from 'yup';
import logger from '~/logger';

// !!! TODO: have to fix this
function getJSONError(error: unknown, route: string) {
  if (error instanceof ValidationError) {
    logger.error(`Validation Error: ${error.message}`);
    return json(error.message, {
      status: 400,
    });
  }

  if (error instanceof createHttpError.HttpError) {
    return json(error.message, {
      status: error.statusCode,
    });
  }

  if (error instanceof Error) {
    return json(error.message, {
      status: 500,
    });
  }

  logger.error(`Unhandled error ${error} at ${route}`);
  logger.error(error);
  return json('Unhandled: An internal server error occurred.', {
    status: 500,
  });
}

export default getJSONError;
