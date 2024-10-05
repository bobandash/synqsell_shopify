export const GET_PROFILE_DEFAULTS = `#graphql 
  query ProfileDefaults {
    shop {
      name
      contactEmail
      description
      url
      currencyCode
      billingAddress {
        city
        provinceCode
        country
      }
    }
  }
`;
