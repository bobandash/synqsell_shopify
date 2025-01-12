import { getCurrencyShopifyFmt, getCurrencyStripeFmt } from "../../currencyFmt";

describe("getCurrencyShopifyFmt", () => {
  it("should return uppercase currency, if valid", () => {
    const currency = getCurrencyShopifyFmt("USD");
    expect(currency).toBe("USD");
  });

  it("should throw error if currency is not valid", () => {
    expect(() => getCurrencyShopifyFmt("XXX")).toThrow();
  });
});

describe("getCurrencyStripeFmt", () => {
  it("should return lowercase currency, if valid", () => {
    const currency = getCurrencyStripeFmt("USD");
    expect(currency).toBe("usd");
  });

  it("should throw error if currency is not valid", () => {
    expect(() => getCurrencyStripeFmt("XXX")).toThrow();
  });
});
