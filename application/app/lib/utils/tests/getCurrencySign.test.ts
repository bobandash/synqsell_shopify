import type { CurrencyCode } from '~/types/admin.types';
import getCurrencySign from '../getCurrencySign';

describe('getCurrencySign', () => {
  test(`should convert currency code to matching currency sign.`, () => {
    expect(getCurrencySign('USD' as CurrencyCode)).toBe('$');
    expect(getCurrencySign('EUR' as CurrencyCode)).toBe('€');
    expect(getCurrencySign('GBP' as CurrencyCode)).toBe('£');
    expect(getCurrencySign('JPY' as CurrencyCode)).toBe('¥');
  });
});
