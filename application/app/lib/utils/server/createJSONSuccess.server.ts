import { json } from '@remix-run/node';
import type { StatusCodes } from 'http-status-codes';

// this is for success messages
function createJSONSuccess(message: string, statusCode: StatusCodes) {
  return json(
    {
      message,
    },
    { status: statusCode },
  );
}

export default createJSONSuccess;
