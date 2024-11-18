export const CREATE_CARRIER_SERVICE = `#graphql 
  mutation carrierServiceCreate($input: DeliveryCarrierServiceCreateInput!) {
    carrierServiceCreate(input: $input) {
      carrierService {
        id
        name
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const GET_INITIAL_CARRIER_SERVICES = `#graphql
  query initialCarrierServices {
    carrierServices(first:5) {
      edges {
        node {
          id
          name
          callbackUrl
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const GET_SUBSEQUENT_CARRIER_SERVICES = `#graphql
  query subsequentCarrierServices($after: String!) {
    carrierServices(after: $after, first:5) {
      edges {
        node {
          id
          name
          callbackUrl
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const DELETE_CARRIER_SERVICE = `#graphql 
  mutation carrierServiceDelete($id: ID!) {
    carrierServiceDelete(id: $id) {
      deletedId
      userErrors {
        field
        message
      }
    }
  }
`;
