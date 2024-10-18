// renders basic info that user can view
export const PRODUCT_BASIC_INFO_QUERY = `#graphql
  query ProductBasicInfo($query: String, $first: Int){
    products(query: $query, first: $first) {
      edges {
        node {
          id
          title
          media(first: 1) {
            edges {
              node {
                id
                alt
                preview {
                  image {
                    url
                  }
                }
              }
            }
          }
          variantsCount {
            count
          }
          onlineStoreUrl
        }
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

export const PRODUCT_CREATION_DETAILS_WITHOUT_MEDIA_QUERY = `#graphql
  query ProductCreationInformation($id: ID!) {
    product(id: $id){
      id
      category {
        id
      }
      descriptionHtml
      productType
      isGiftCard
      options {
        name
        position
        optionValues {
          name
        }
      }
      requiresSellingPlan
      status
      tags
      title
      mediaCount {
        count
      }
    }
  }
`;

export const PRODUCT_GET_MEDIA = `#graphql
  query ProductMedia($id: ID!, $first: Int!) {
    product(id: $id) {
      media(first: $first) {
        edges {
          node {
            alt
            mediaContentType
            ... on MediaImage {
              image {
                url
              }
            }
            ... on Video {
              sources {
                url
              }
            }
            ... on ExternalVideo {
              originUrl
            }
            ... on Model3d {
              sources {
                url
              }
            }
          }
        }
      }
    }
  }
`;

export const CREATE_PRODUCT_MUTATION = `#graphql
  mutation ProductCreate($input: ProductInput!, $media: [CreateMediaInput!]) {
    productCreate(input: $input, media: $media) {
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

export const GET_PRODUCT_STATUS = `#graphql 
  query ProductStatus($id: ID!){
    product(id: $id){
      id
      status
    }
  }
`;

export const GET_PRODUCT_URL = `#graphql
  query ProductUrl($first: Int, $query: String) {
    products(first: $first, query: $query) {
      edges {
        node {
          id
          onlineStoreUrl
        }
      }
    }
  }
`;

export const UPDATE_PRODUCT_STATUS_MUTATION = `#graphql
  mutation UpdateProductStatus($input: ProductInput!) {
    productUpdate(input: $input) {
      product {
        id
        status
      }
      userErrors {
        field
        message
      }
    }
  }
`;
