import round from '../../round';

describe('round', () => {
  test(`should round properly based on number of decimals.`, () => {
    const rawNumber = 1.98654;
    expect(round(rawNumber, 2)).toBe(1.99);
    expect(round(rawNumber, 3)).toBe(1.987);
    expect(round(rawNumber, 0)).toBe(2);
  });

  test(`should throw error if decimals less than 0.`, () => {
    const rawNumber = 1.98654;
    const errorMessage =
      'Rounded decimals have to be greater than or equal to 0.';

    expect(() => {
      round(rawNumber, -1);
    }).toThrow(errorMessage);
    expect(() => {
      round(rawNumber, -10);
    }).toThrow(errorMessage);
  });
});
