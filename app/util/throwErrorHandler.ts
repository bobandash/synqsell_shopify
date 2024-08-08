import {
  PrismaClientKnownRequestError,
  PrismaClientRustPanicError,
  PrismaClientUnknownRequestError,
  PrismaClientValidationError,
} from "@prisma/client/runtime/library";
import logger from "logger";
import createHttpError from "http-errors";
import { ValidationError } from "yup";

function throwErrorHandler(
  error: unknown,
  context: string,
  defaultMessage: string,
) {
  if (isPrismaError(error)) {
    logger.error(`${context}: prisma error ${error.message}`);
    throwPrismaError(error);
  } else if (error instanceof ValidationError) {
    logger.error(`${context}: validation error ${error.message}`);
    throw new createHttpError.BadRequest(error.message);
  } // case: http error is when already threw an error before
  else if (createHttpError.isHttpError(error)) {
    throw error;
  } else if (error instanceof Error) {
    logger.error(`${context}: ${error.message}`);
    throw new createHttpError.InternalServerError(defaultMessage);
  }
  // Case unhandled error
  logger.error(`${context}: Unhandled error`);
  throw new createHttpError.InternalServerError(defaultMessage);
}

function isPrismaError(
  error: unknown,
): error is
  | PrismaClientKnownRequestError
  | PrismaClientUnknownRequestError
  | PrismaClientRustPanicError
  | PrismaClientValidationError {
  return (
    error instanceof PrismaClientKnownRequestError ||
    error instanceof PrismaClientUnknownRequestError ||
    error instanceof PrismaClientRustPanicError ||
    error instanceof PrismaClientValidationError
  );
}

function throwPrismaError(error: unknown) {
  if (error instanceof PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P1000": // Authentication failed
        throw new createHttpError.Unauthorized(
          "Authentication failed. Please check your database credentials.",
        );
      case "P1003": // Database does not exist at path or server
      case "P1004": // Database schema does not exist
      case "P1005": // Database does not exist on server
        throw new createHttpError.NotFound(
          "Database not found. Please verify the database configuration.",
        );
      case "P1009": // Database already exists
        throw new createHttpError.BadRequest(
          "The database already exists. Please choose a different name.",
        );
      case "P1010": // User was denied access
        throw new createHttpError.Unauthorized(
          "Access denied. Please check your user permissions.",
        );
      // 408 Request Timeout
      case "P1002": // Database server timed out
      case "P1008": // Operations timed out
        throw new createHttpError.RequestTimeout(
          "Request timed out. Please try again later.",
        );
      default:
        throw new createHttpError.RequestTimeout(
          "An unexpected error occurred. Please try again.",
        );
    }
  } else if (error instanceof PrismaClientUnknownRequestError) {
    throw new createHttpError.InternalServerError(
      "An unknown error occurred while processing your request. Please try again.",
    );
  } else if (error instanceof PrismaClientRustPanicError) {
    throw new createHttpError.InternalServerError(
      "A critical error occurred with the database. Please contact support.",
    );
  } else if (error instanceof PrismaClientValidationError) {
    throw new createHttpError.InternalServerError(
      "Validation error in the database schema. Please review your schema configuration.",
    );
  } else {
    throw new Error("An unexpected error occurred. Please try again.");
  }
}

export default throwErrorHandler;
