import convertObjectValuesToArr from '../../convertObjectValuesToArr';

describe('convertObjectValuesToArr', () => {
  test('should convert object values to array', () => {
    const ROLES = {
      ADMIN: 'admin',
      STAFF: 'staff',
      CUSTOMER: 'customer',
    };

    const arr = convertObjectValuesToArr(ROLES);
    expect(arr.length).toBe(3);
    expect(arr).toEqual(['admin', 'staff', 'customer']);
  });
});
