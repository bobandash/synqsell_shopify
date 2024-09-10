export const GET_VARIANTS_BASIC_INFO = `#graphql 
  query VariantBasicInfo($query: String, $first: Int){
    productVariants(query: $query, first: $first){
      edges {
        node {
          id
          title
          sku
        }
      }
    }
  }
`;

export const VARIANT_CREATION_DETAILS_BULK_QUERY = `#graphql 
  query variantCreationInformation($query: String, $first: Int){
    productVariants(query: $query, first: $first){
      edges {
        node {
          id
          barcode
          compareAtPrice
          selectedOptions{
            name,
            value
          }
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
            sku
            tracked
            requiresShipping
          }
          inventoryPolicy
          inventoryQuantity
          taxCode
          taxable
        }
      }
    }
  }
`;

// https://shopify.dev/docs/api/admin-graphql/2024-07/mutations/productVariantsBulkCreate
export const VARIANTS_BULK_CREATION_MUTATION = `#graphql
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
