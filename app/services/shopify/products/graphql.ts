// shopify graphql has an issue where they can't detect fragments
const MODEL_3D_FIELDS_FRAGMENT = `#graphql
  fragment Model3dFields on Model3d {
    mediaContentType
    alt
    originalSource {
      url
    }
  }
`;

const VIDEO_FIELDS_FRAGMENT = `#graphql
  fragment VideoFields on Video {
    mediaContentType
    alt
    originalSource {
      url
    }
  }
`;

const IMAGE_FIELDS_FRAGMENT = `#graphql
  fragment ImageFields on Image {
    url
    alt: altText
  }
`;

export const PRODUCT_QUERY = `#graphql
  ${MODEL_3D_FIELDS_FRAGMENT}
  ${VIDEO_FIELDS_FRAGMENT}
  ${IMAGE_FIELDS_FRAGMENT}
  query ProductInformationForPrismaQuery($query: String, $first: Int) {
    products(query: $query, first: $first) {
      edges {
        node {
          id
          category {
            id
          }
          productType
          description
          descriptionHtml
          status
          vendor
          title
          variantsCount {
            count
          }
          images(first: 10) {
            edges {
              node {
                ...ImageFields
              }
            }
          }
          media(first: 10) {
            edges {
              node {
                ...Model3dFields
                ...VideoFields
              }
            }
          }
        }
      }
    }
  }
`;

// https://shopify.dev/docs/api/admin-graphql/2024-07/mutations/productCreate
export const CREATE_PRODUCT_MUTATION = `#graphql
  mutation createProductMutation($input: ProductInput!) {
    productCreate(input: $input) {
      product {
        id
      }
      userErrors {
        message
        field
      }
    }
  }
`;



// https://shopify.dev/docs/api/admin-graphql/2024-07/mutations/inventoryActivate
// this actives the fulfillment center and on hand qty
export const ACTIVATE_INVENTORY_ITEM = `#graphql
  mutation ActivateInventoryItem($inventoryItemId: ID!, $locationId: ID!, $available: Int) {
    inventoryActivate(inventoryItemId: $inventoryItemId, locationId: $locationId, available: $available) {
      inventoryLevel {
        id
        quantities(names: ["available"]) {
          name
          quantity
        }
        item {
          id
        }
        location {
          id
        }
      }
    }
  }
`;
