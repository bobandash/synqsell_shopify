// THE QUERIES AND MUTATIONS BELOW USE THE STOREFRONT API
const DELIVERY_GROUP_FRAGMENT = `#graphql
  fragment DeliveryGroups on Cart {
    deliveryGroups(first: 10, withCarrierRates: true) {
      edges {
        node {
          deliveryOptions {
            title
            handle
            estimatedCost {
              amount
              currencyCode
            }
          }
        }
      }
    }
  }
`;

export const CART_CREATE_MUTATION = `#graphql
  ${DELIVERY_GROUP_FRAGMENT}
  mutation cartCreate($input: CartInput!) {
    cartCreate(input: $input) {
      cart {
        id 
        ...DeliveryGroups @defer
      }
      userErrors {
        field
        message
      }
    }
  }
`;
