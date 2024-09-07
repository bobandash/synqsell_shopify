export const GET_VARIANTS = `#graphql 
  query VariantInformationForPrismaQuery($query: String, $first: Int){
    productVariants(query: $query, first: $first){
      edges {
        node {
          id
          barcode,
          compareAtPrice
          inventoryItem {
            countryCodeOfOrigin
            harmonizedSystemCode
            measurement {
              weight {
                unit
                value
              }
            }
            provinceCodeOfOrigin
            requiresShipping
            sku
            tracked
          }
          inventoryPolicy
          inventoryQuantity
          price
          taxable
          taxCode
          selectedOptions {
            name
            value
          }
        }
      }
    }
  }
`;
