import { simpleFaker } from '@faker-js/faker/.';
import { exportsForTesting } from '../../util';
if (!exportsForTesting) {
    throw new Error('Environment is not test environment');
}

const { round, getMarginPricingDetails } = exportsForTesting;

describe('getPricingDetails', () => {
    describe('round', () => {
        test('should round to specified number of decimal places', () => {
            const number = 3.14159;
            expect(round(number, 2)).toBe(3.14);
            expect(round(number, 3)).toBe(3.142);
            expect(round(number, 4)).toBe(3.1416);
        });

        test('should handle rounding up correctly', () => {
            const number = 3.56789;
            expect(round(number, 2)).toBe(3.57);
            expect(round(number, 1)).toBe(3.6);
        });

        test('should handle rounding down correctly', () => {
            const number = 3.14449;
            expect(round(number, 2)).toBe(3.14);
            expect(round(number, 1)).toBe(3.1);
        });

        test('should handle negative numbers', () => {
            const number = -3.14159;
            expect(round(number, 2)).toBe(-3.14);
            expect(round(number, 1)).toBe(-3.1);
        });

        test('should handle zero decimal places', () => {
            const number = 3.14159;
            const numberTwo = 3.54321;
            expect(round(number, 0)).toBe(3);
            expect(round(numberTwo, 0)).toBe(4);
        });

        test('should throw error for invalid decimal places', () => {
            const number = 3.14159;
            expect(() => round(number, -1)).toThrow();
        });
    });

    describe('getMarginPricingDetails', () => {
        it('should return correct pricing information for one variant', () => {
            const margin = 10;
            const variants = [
                {
                    shopifyVariantId: simpleFaker.string.uuid(),
                    retailPrice: '21.00',
                },
            ];
            expect(getMarginPricingDetails(variants, margin)).toEqual([
                {
                    shopifyVariantId: variants[0].shopifyVariantId,
                    retailPrice: variants[0].retailPrice,
                    retailerPayment: '2.10',
                    supplierProfit: '18.90',
                },
            ]);
        });

        it('should return correct pricing information for multiple variants', () => {
            const margin = 15;
            const variants = [
                {
                    shopifyVariantId: simpleFaker.string.uuid(),
                    retailPrice: '21.99',
                },
                {
                    shopifyVariantId: simpleFaker.string.uuid(),
                    retailPrice: '30.00',
                },
            ];

            expect(getMarginPricingDetails(variants, margin)).toEqual([
                {
                    shopifyVariantId: variants[0].shopifyVariantId,
                    retailPrice: variants[0].retailPrice,
                    retailerPayment: '3.30',
                    supplierProfit: '18.69',
                },
                {
                    shopifyVariantId: variants[1].shopifyVariantId,
                    retailPrice: variants[1].retailPrice,
                    retailerPayment: '4.50',
                    supplierProfit: '25.50',
                },
            ]);
        });
    });
});
