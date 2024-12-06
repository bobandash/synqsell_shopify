import createMapIdToRestObj from '../createMapIdToRestObj';

describe('createMapIdToRestObj', () => {
  test(`should create a hashmap with the key's value to other object values`, () => {
    const obj = [
      {
        id: '123',
        name: 'Bob',
        favoriteFood: 'tacos',
      },
      {
        id: '245',
        name: 'Potato',
        favoriteFood: 'burritos',
      },
    ];
    const idToRest = createMapIdToRestObj(obj, 'id');
    const hashMap = new Map();
    hashMap.set('123', {
      name: 'Bob',
      favoriteFood: 'tacos',
    });
    hashMap.set('245', {
      name: 'Potato',
      favoriteFood: 'burritos',
    });
    expect(idToRest).toEqual(hashMap);
  });

  test('should work with different key names', () => {
    const obj = [
      { userId: '1', name: 'Alice' },
      { userId: '2', name: 'Bob' },
    ];
    const result = createMapIdToRestObj(obj, 'userId');
    expect(result.get('1')).toEqual({ name: 'Alice' });
    expect(result.get('2')).toEqual({ name: 'Bob' });
  });

  test('should handle empty array', () => {
    const result = createMapIdToRestObj([], 'id');
    expect(result.size).toBe(0);
  });

  test('should skip entries with undefined', () => {
    const obj = [
      { id: undefined, name: 'Skip' },
      { id: '1', name: 'Keep' },
    ];
    const result = createMapIdToRestObj(obj, 'id');
    expect(result.size).toBe(1);
    expect(result.get('1')).toEqual({ name: 'Keep' });
  });
});
