import convertToDate from '../../convertToDate';

describe('convertToDate', () => {
  test('should not be able to convert date if empty string', () => {
    expect(() => {
      convertToDate('');
    }).toThrow('Invalid date format');
  });

  test('should return date if only numbers', () => {
    const date = convertToDate('123');
    expect(date).not.toBeNull();
  });

  test('should return valid date if date is hyphen-delimited', () => {
    const date = convertToDate('2024-12-05');
    expect(typeof date).toBe('string');
    expect(date).toMatch(/Dec/);
    expect(date).toMatch(/2024/);
    const secondCall = convertToDate('2024-12-05');
    expect(date).toBe(secondCall);
  });

  test('should return valid date if date is / delimited', () => {
    const date = convertToDate('12/05/2024');
    expect(typeof date).toBe('string');
    expect(date).toMatch(/Dec/);
    expect(date).toMatch(/2024/);
  });

  test('should return valid date if is Long ISO format with UTC', () => {
    const date = convertToDate('2024-12-05T14:30:00.000Z');
    expect(typeof date).toBe('string');
    expect(date).toMatch(/Dec/);
    expect(date).toMatch(/2024/);
  });
});
