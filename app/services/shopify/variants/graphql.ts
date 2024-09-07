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

// https://shopify.dev/docs/api/admin-graphql/2024-07/mutations/productVariantsBulkCreate
export const CREATE_VARIANTS_BULK_MUTATION = `#graphql
  mutation productVariantsBulkCreate($productId: ID!, $variants: [ProductVariantsBulkInput!]!, $strategy: ProductVariantsBulkCreateStrategy) {
      productVariantsBulkCreate(productId: $productId, variants: $variants, strategy: $strategy) {
        product {
          id
        }
        productVariants {
          id
          inventoryItem {
            id
          }
        }
        userErrors {
          field
          message
        }
      }
    }
`;
