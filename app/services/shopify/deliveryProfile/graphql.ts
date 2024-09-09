export const CREATE_DELIVERY_PROFILE = `#graphql 
  mutation createDeliveryProfile($profile: DeliveryProfileInput!) {
  deliveryProfileCreate(profile: $profile) {
    profile {
      id
      name
      profileLocationGroups {
        locationGroup {
          id
          locations(first: 5) {
            nodes {
              name
              address {
                country
              }
            }
          }
        }
        locationGroupZones(first: 2) {
          edges {
            node {
              zone {
                id
                name
                countries {
                  code {
                    countryCode
                  }
                  provinces {
                    code
                  }
                }
              }
            }
          }
        }
      }
    }
    userErrors {
      field
      message
    }
  }
}`;
