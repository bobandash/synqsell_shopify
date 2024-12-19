import { Prisma } from '@prisma/client';
import { Unauthorized } from 'http-errors';
import { StatusCodes } from 'http-status-codes';
import { ValidationError } from 'yup';
import getRouteError from '../../getRouteError.server';

jest.mock('../../createJSONError.server', () => ({
  ...jest.requireActual('../../createJSONError.server'),
  __esModule: true,
  default: jest.fn((message, statusCode) => ({ message, statusCode })),
}));

describe('getRouteError', () => {
  const defaultMessage = 'Something went wrong.';
  const unhandledErrorMessage =
    'An internal server error occurred. Please contact support.';

  describe('PrismaClientKnownRequestError handling', () => {
    test('should handle P2002 (unique constraint violation)', () => {
      const error = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '4.x.x',
        },
      );

      const result = getRouteError(error, defaultMessage);
      expect(result).toEqual({
        message: unhandledErrorMessage,
        statusCode: StatusCodes.CONFLICT,
      });
    });

    test('should handle P2025 (record not found)', () => {
      const error = new Prisma.PrismaClientKnownRequestError(
        'Record not found',
        {
          code: 'P2025',
          clientVersion: '4.x.x',
        },
      );

      const result = getRouteError(error, defaultMessage);

      expect(result).toEqual({
        message: unhandledErrorMessage,
        statusCode: StatusCodes.NOT_FOUND,
      });
    });

    test('should handle unknown Prisma error codes', () => {
      const error = new Prisma.PrismaClientKnownRequestError('Unknown error', {
        code: 'P2999',
        clientVersion: '4.x.x',
      });

      const result = getRouteError(error, defaultMessage);

      expect(result).toEqual({
        message: unhandledErrorMessage,
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      });
    });
  });

  describe('ValidationError handling', () => {
    test('should use ValidationError message instead of default message', () => {
      const validationMessage = 'Invalid input';
      const error = new ValidationError(validationMessage);

      const result = getRouteError(error, defaultMessage);

      expect(result).toEqual({
        message: validationMessage,
        statusCode: StatusCodes.BAD_REQUEST,
      });
    });
  });

  describe('HttpError handling', () => {
    test('should use HttpError message and status code', () => {
      const error = Unauthorized('Not authorized');
      const result = getRouteError(error, defaultMessage);

      expect(result).toEqual({
        message: error.message,
        statusCode: StatusCodes.UNAUTHORIZED,
      });
    });
  });

  describe('Generic Error handling', () => {
    test('should handle standard Error objects', () => {
      const error = new Error('Standard error');

      const result = getRouteError(error, defaultMessage);

      expect(result).toEqual({
        message: `${defaultMessage}`,
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      });
    });
  });

  describe('Unknown error handling', () => {
    test('should handle undefined error', () => {
      const result = getRouteError(undefined);

      expect(result).toEqual({
        message: unhandledErrorMessage,
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      });
    });

    test('should handle null error', () => {
      const result = getRouteError(null);

      expect(result).toEqual({
        message: unhandledErrorMessage,
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      });
    });
  });
});
