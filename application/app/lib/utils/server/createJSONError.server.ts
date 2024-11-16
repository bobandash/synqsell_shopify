import { json } from '@remix-run/node';

// this is for explicit error messages inside the loader or action
function createJSONError(message: string, statusCode: number) {
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
