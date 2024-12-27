import { NotFound } from 'http-errors';
import logError, { exportsForTesting } from '../../logError.server';
import { v4 as uuidv4 } from 'uuid';
import logger from '~/logger';
import { Prisma } from '@prisma/client';

jest.mock('uuid', () => ({
  v4: jest.fn(() => '123'),
}));

describe('getLogReferenceId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should call uuid with reference id', () => {
    // Test the public logError function
    const referenceId = exportsForTesting?.getLogReferenceId();
    expect(uuidv4).toHaveBeenCalledTimes(1);
    expect(referenceId).toBe('ref-123');
  });
});

describe('logError', () => {
  const loggerErrorSpy = jest.spyOn(logger, 'error');
  const loggerInfoSpy = jest.spyOn(logger, 'info');
  const clientVersion = '3.5.0';
  const referenceId = 'ref-123';
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('HttpError', () => {
    test('should log HTTP error as info', () => {
      const error = NotFound('Information has not been found');
      logError(error);
      const loggedData = loggerInfoSpy.mock.calls[0][0];
      expect(loggerErrorSpy).toHaveBeenCalledTimes(0);
      expect(loggedData).toHaveProperty('referenceId', referenceId);
      expect(loggedData).toHaveProperty('name', 'HTTPError');
      expect(loggedData).toHaveProperty(
        'message',
        'Information has not been found',
      );
      expect(loggedData).toHaveProperty('stack');
    });

    test('should log context', () => {
      const error = NotFound('Information has not been found');
      logError(error, { sessionId: '123' });
      const loggedData = loggerInfoSpy.mock.calls[0][0];
      expect(loggedData).toHaveProperty('sessionId', '123');
    });
  });

  describe('PrismaError', () => {
    test('should log PrismaClientKnownRequestError correctly', () => {
      const error = new Prisma.PrismaClientKnownRequestError(
        'Failed to handle query constraint.',
        {
          code: 'P2002',
          clientVersion: clientVersion,
          meta: { field_name: 'email' },
          batchRequestIdx: 1,
        },
      );

      logError(error);

      const loggedData = loggerErrorSpy.mock.calls[0][0];
      expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
      expect(loggedData).toHaveProperty('referenceId', referenceId);
      expect(loggedData).toHaveProperty('name', 'PrismaError');
      expect(loggedData).toHaveProperty('code', 'P2002');
      expect(loggedData).toHaveProperty(
        'message',
        'Failed to handle query constraint.',
      );
    });

    test('should log PrismaClientInitializationError correctly', () => {
      const error = new Prisma.PrismaClientInitializationError(
        'Failed to reach database.',
        clientVersion,
      );
      logError(error);

      const loggedData = loggerErrorSpy.mock.calls[0][0];
      expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
      expect(loggedData).toHaveProperty('referenceId', referenceId);
      expect(loggedData).toHaveProperty('name', 'PrismaInitializationError');
      expect(loggedData).toHaveProperty('message', 'Failed to reach database.');
      expect(loggedData).toHaveProperty('clientVersion', clientVersion);
    });

    test('should log PrismaClientValidationError correctly', () => {
      const error = new Prisma.PrismaClientValidationError(
        'Invalid query parameters.',
        { clientVersion },
      );

      logError(error);

      const loggedData = loggerErrorSpy.mock.calls[0][0];
      expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
      expect(loggedData).toHaveProperty('referenceId', referenceId);
      expect(loggedData).toHaveProperty('name', 'PrismaValidationError');
      expect(loggedData).toHaveProperty(
        'message',
        'Failed to validate database query parameters.',
      );
    });
  });

  describe('Generic Error', () => {
    test('should log generic error with details', () => {
      const error = new Error('Something went wrong');
      logError(error);
      const loggedData = loggerErrorSpy.mock.calls[0][0];
      expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
      expect(loggedData).toHaveProperty('referenceId', referenceId);
      expect(loggedData).toHaveProperty('name', error.name);
      expect(loggedData).toHaveProperty('message', 'Something went wrong');
      expect(loggedData).toHaveProperty('stack'); // Ensure stack trace is logged
    });
  });

  describe('Unhandled Error', () => {
    test('should log unhandled error if error passed is not type Error', () => {
      const error = 'Unhandled';
      logError(error);
      const loggedData = loggerErrorSpy.mock.calls[0][0] as object & {
        errorDetails: {};
      };
      expect(loggedData).toHaveProperty('errorDetails');
      expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
      expect(loggedData).toHaveProperty('referenceId', referenceId);
      expect(loggedData).toHaveProperty('name', 'UnhandledError');
      expect(loggedData).toHaveProperty('message', String(error));
      expect(loggedData).toHaveProperty('errorType', 'string');
      expect(loggedData.errorDetails).toHaveProperty('toString', 'Unhandled');
    });
  });
});
