// https://shopify.dev/docs/api/admin-graphql/2024-07/mutations/productCreateMedia
export const CREATE_PRODUCT_MEDIA_MUTATION = `#graphql
  mutation createProductMediaMutation($media: [CreateMediaInput!]!, $productId: ID!) {
    productCreateMedia(media: $media, productId: $productId) {
      media {
        id
      }
      mediaUserErrors {
        field
        message
      }
      product {
        id
      }
    }
  }
`;
