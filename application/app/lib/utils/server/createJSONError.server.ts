import { json } from '@remix-run/node';
import logError from './logError.server';

// This function is used to get errors for actions / loaders to pass to UI
function createJSONError(message: string, statusCode: number) {
  if (statusCode < 400 || statusCode >= 600) {
    logError(
      new Error(`Invalid statusCode input ${statusCode} for ${message}`),
      'createJSONError',
    );
    statusCode = 500;
  }

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
