import { BadRequest } from 'http-errors';
import createJSONSuccess from '../../createJSONSuccess.server';
describe('createJSONSuccess', () => {
  it('should return a consistent JSON structure for a given success', async () => {
    const message = 'Successfully logged in.';
    const statusCode = 200;
    const response = createJSONSuccess(message, statusCode);
    const responseData = await response.json();
    const expectedOutput = {
      message,
    };
    expect(responseData).toEqual(expectedOutput);
    expect(response.status).toBe(statusCode);
  });

  it('should throw an error when status code is invalid', () => {
    const message = 'Unsuccessfully logged in.';
    const statusCode = 400;
    expect(() => createJSONSuccess(message, statusCode)).toThrow(BadRequest);
  });
});
