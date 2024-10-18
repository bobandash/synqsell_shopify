export const GET_ALL_FULFILLMENT_SERVICES = `#graphql
  query allFulfillmentServices {
    shop {
      fulfillmentServices {
        id
        serviceName
        callbackUrl
        location {
          id
        }
        trackingSupport
      }
    }
  }
`;

export const DELETE_FULFILLMENT_SERVICE = `#graphql
  mutation fulfillmentServiceDelete($id: ID!) {
    fulfillmentServiceDelete(id: $id) {
      deletedId
      userErrors {
        field
        message
      }
    }
  }
`;

export const CREATE_FULFILLMENT_SERVICE = `#graphql
  mutation fulfillmentServiceCreate(
    $name: String!
    $callbackUrl: URL!
    $trackingSupport: Boolean!
  ) {
    fulfillmentServiceCreate(
      name: $name
      callbackUrl: $callbackUrl
      trackingSupport: $trackingSupport
    ) {
      fulfillmentService {
        id
        serviceName
        callbackUrl
        location {
          id
        }
        trackingSupport
      }
      userErrors {
        field
        message
      }
    }
  }
`;
