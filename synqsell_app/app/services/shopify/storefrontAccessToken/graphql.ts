export const CREATE_STOREFRONT_ACCESS_TOKEN = `#graphql 
  mutation StorefrontAccessTokenCreate($input: StorefrontAccessTokenInput!) {
      storefrontAccessTokenCreate(input: $input) {
        userErrors {
          field
          message
        }
        shop {
          id
        }
        storefrontAccessToken {
          accessScopes {
            handle
          }
          accessToken
          title
        }
      }
    }
`;
