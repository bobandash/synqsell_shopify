function getCurrencyStripeFmt(currency: string) {
  return currency.toLowerCase();
}

// shopify api only accepts currency code in upper case fmt
function getCurrencyShopifyFmt(currency: string) {
  return currency.toUpperCase();
}

export { getCurrencyShopifyFmt, getCurrencyStripeFmt };
