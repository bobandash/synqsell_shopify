import { json } from '@remix-run/node';
import logger from '~/logger';

// this is for explicit error messages inside the loader or action
function createJSONError(message: string, statusCode: number) {
  logger.error(message);
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

export default createJSONError;
