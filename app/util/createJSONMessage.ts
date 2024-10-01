import { json } from '@remix-run/node';
import type { StatusCodes } from 'http-status-codes';

function createJSONMessage(message: string, statusCode: StatusCodes) {
  return json(
    {
      message,
    },
    { status: statusCode },
  );
}

export default createJSONMessage;
