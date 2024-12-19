import { json } from '@remix-run/node';
import * as createHttpError from 'http-errors';
import type { StatusCodes } from 'http-status-codes';

// this is for success messages
function createJSONSuccess(message: string, statusCode: StatusCodes) {
  if (statusCode >= 400) {
    throw new createHttpError.BadRequest(
      `Invalid statusCode ${statusCode}. Success status codes must be < 400.`,
    );
  }

  return json(
    {
      message,
    },
    { status: statusCode },
  );
}

export default createJSONSuccess;
