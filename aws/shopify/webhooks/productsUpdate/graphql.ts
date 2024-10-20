export const PRODUCT_VARIANT_BULK_UPDATE_PRICE = `#graphql
  mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      product {
        id
      }
    }
  }
`;

export const PRODUCT_VARIANT_INFO = `#graphql
  query ProductVariantInfo($id: ID!) {
    productVariant(id: $id) {
      id
      price
      inventoryQuantity
    }
  }
`;

export const GET_PRODUCT_STATUS = `#graphql 
  query ProductStatus($id: ID!){
    product(id: $id){
      id
      status
    }
  }
`;

export const UPDATE_PRODUCT_MUTATION = `#graphql
  mutation UpdateProduct($input: ProductInput!) {
    productUpdate(input: $input) {
      product {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const ADJUST_INVENTORY_MUTATION = `#graphql 
  mutation inventorySetQuantities($input: InventorySetQuantitiesInput!) {
    inventorySetQuantities(input: $input) {
      inventoryAdjustmentGroup {
        reason
        referenceDocumentUri
        changes {
          name
          delta
          quantityAfterChange
        }
      }
      userErrors {
        code
        field
        message
      }
    }
  }
`;
