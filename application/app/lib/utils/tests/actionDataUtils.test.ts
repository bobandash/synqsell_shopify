import { isActionDataError, isActionDataSuccess } from '../actionDataUtils';

describe('isActionDataError', () => {
  it('should return true if matches format', () => {
    const errorMessage = {
      error: {
        message: 'There was an error.',
      },
    };
    expect(isActionDataError(errorMessage)).toBe(true);
  });

  it('should return false if does not match format', () => {
    const errorMessage = {
      message: 'There was an error.',
    };
    expect(isActionDataError(errorMessage)).toBe(false);
  });
});

describe('isActionDataSuccess', () => {
  it('should return true if matches format', () => {
    const message = {
      message: 'There was an error.',
    };
    expect(isActionDataSuccess(message)).toBe(true);
  });

  it('should return false if does not match format', () => {
    const message = {
      error: {
        message: 'There was an error.',
      },
    };
    expect(isActionDataSuccess(message)).toBe(false);
  });
});
