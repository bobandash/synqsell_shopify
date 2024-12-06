import createJSONError from '../../createJSONError.server';
const logError = jest.requireActual('../../logError.server');

describe('createJSONError', () => {
  const spyLogError = jest.spyOn(logError, 'default');

  it('should return a consistent JSON structure for a given error', async () => {
    const errorMessage = 'Unauthorized to view route.';
    const statusCode = 401;
    const response = createJSONError(errorMessage, statusCode);
    const responseData = await response.json();
    const expectedOutput = {
      error: {
        message: errorMessage,
      },
    };
    expect(responseData).toEqual(expectedOutput);
    expect(response.status).toBe(statusCode);
  });

  it('should return a status code of 500 and log when passed invalid statuses', () => {
    const errorMessage = 'Unauthorized to view route.';
    const statusCode = 200;
    const response = createJSONError(errorMessage, statusCode);
    expect(spyLogError).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(500);
  });
});
