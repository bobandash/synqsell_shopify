import { json } from "@remix-run/node";
import createHttpError from "http-errors";
import logger from "logger";

function throwError(error: unknown, route: string) {
  if (error instanceof createHttpError.HttpError) {
    logger.error(`HTTP Error: ${error.message}`);
    throw json(error.message, {
      status: error.statusCode,
    });
  }

  if (error instanceof Error) {
    logger.error(`Error: ${error.message}`);
    throw json(error.message, {
      status: 500,
    });
  }

  logger.error(`Unhandled error at ${route}`);
  throw json("Unhandled: An internal server error occurred.", {
    status: 500,
  });
}

export default throwError;
