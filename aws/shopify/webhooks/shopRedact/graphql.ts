export const DELETE_PRODUCT_MUTATION = `#graphql 
  mutation productDelete($id: ID!) {
    productDelete(input: {id: $id}) {
      deletedProductId
      userErrors {
        field
        message
      }
    }
  }
`;
