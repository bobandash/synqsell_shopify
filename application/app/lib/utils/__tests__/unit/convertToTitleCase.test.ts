import convertToTitleCase from '../../convertToTitleCase';

describe('convertToTitleCase', () => {
  test('should capitalize words in a phrase with spaces', () => {
    const phrase = 'Peter piper picked';
    expect(convertToTitleCase(phrase)).toBe('Peter Piper Picked');
  });

  test(`should not capitalize and split word if it's a single word`, () => {
    const phrase = 'Peterpiper';
    expect(convertToTitleCase(phrase)).toBe('Peterpiper');
  });
});
