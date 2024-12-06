import convertFormDataToObject from '../../convertFormDataToObject';

describe('convertFormDataToObject', () => {
  let formData: FormData;

  beforeEach(() => {
    formData = new FormData();
  });

  test('should convert string values', () => {
    formData.append('name', 'John Doe');
    formData.append('email', 'john@example.com');

    const result = convertFormDataToObject(formData);

    expect(result).toEqual({
      name: 'John Doe',
      email: 'john@example.com',
    });
  });

  test('should convert boolean values', () => {
    formData.append('isActive', 'true');
    formData.append('isDeleted', 'false');

    const result = convertFormDataToObject(formData);

    expect(result).toEqual({
      isActive: true,
      isDeleted: false,
    });
  });

  test('should convert numeric values', () => {
    formData.append('age', '25');
    formData.append('price', '99.99');

    const result = convertFormDataToObject(formData);

    expect(result).toEqual({
      age: 25,
      price: 99.99,
    });
  });

  test('should convert date values', () => {
    const dateStr = '2024-01-01';
    formData.append('startDate', dateStr);

    const result = convertFormDataToObject(formData);

    expect(result.startDate).toBeInstanceOf(Date);
    expect(result.startDate.toISOString().slice(0, 10)).toBe(dateStr);
  });

  test('should parse JSON strings', () => {
    const user = { id: 1, name: 'John' };
    formData.append('userData', JSON.stringify(user));

    const result = convertFormDataToObject(formData);

    expect(result.userData).toEqual(user);
  });

  test('should handle invalid JSON as regular strings', () => {
    const invalidJson = '{name: John}'; // Invalid JSON syntax
    formData.append('invalidData', invalidJson);

    const result = convertFormDataToObject(formData);

    expect(result.invalidData).toBe(invalidJson);
  });

  test('should handle mixed types', () => {
    formData.append('name', 'John');
    formData.append('age', '30');
    formData.append('isAdmin', 'true');
    formData.append('joined', '2024-01-01');
    formData.append('settings', JSON.stringify({ theme: 'dark' }));

    const result = convertFormDataToObject(formData);

    expect(result).toEqual({
      name: 'John',
      age: 30,
      isAdmin: true,
      joined: new Date('2024-01-01'),
      settings: { theme: 'dark' },
    });
  });
});
