import { nodesFromEdges } from '@shopify/admin-graphql-api-utilities';
import { type GraphQL } from '~/types';
import { errorHandler } from '../util';
import type { CoreProductProps } from '../types';
import gql from 'graphql-tag';
import {
  IMAGE_FIELDS_FRAGMENT,
  MODEL_3D_FIELDS_FRAGMENT,
  VIDEO_FIELDS_FRAGMENT,
} from './util/fragments';
import getQueryStr from './util/getQueryStr';

export async function getIdMappedToStoreUrl(
  graphql: GraphQL,
  sessionId: string,
  productIds: string[],
) {
  try {
    const numProducts = productIds.length;
    const queryStr = getQueryStr(productIds);
    const response = await graphql(
      `
        query ProductUrlsQuery($first: Int, $query: String) {
          products(first: $first, query: $query) {
            edges {
              node {
                id
                onlineStoreUrl
              }
            }
          }
        }
      `,
      {
        variables: {
          first: numProducts,
          query: queryStr,
        },
      },
    );
    const { data } = await response.json();
    if (!data) {
      return {};
    }

    const {
      products: { edges },
    } = data;
    const nodes = nodesFromEdges(edges);
    const idToStoreUrl = nodes.reduce((acc, node) => {
      const { id, onlineStoreUrl } = node;
      return {
        ...acc,
        [id]: onlineStoreUrl,
      };
    }, {});

    return idToStoreUrl;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to retrieve product urls from product ids.',
      getIdMappedToStoreUrl,
      { productIds, sessionId },
    );
  }
}

// helper graphql queries for product information
const ProductsQuery = (productIds: string[]) => {
  const queryStr = getQueryStr(productIds);
  return gql(
    `
    ${MODEL_3D_FIELDS_FRAGMENT},
    ${VIDEO_FIELDS_FRAGMENT},
    ${IMAGE_FIELDS_FRAGMENT}
      query ProductUrlsQuery($query: String) {
        products(query: $query) {
          edges {
            node {
              id
              category {
                id
              }
              productType
              description
              descriptionHtml
              seo {
                description
                title
              }
              status
              vendor
              images(first: 20){
                edges{
                  node{
                    ...ImageFields
                  }
                }
              }
              media(first: 20){
                edges {
                  node {
                    ...Model3dFields,
                    ...VideoFields
                  }
                }
              }
            }
          }
        }
      }
    `,
    {
      variables: {
        query: queryStr,
      },
    },
  );
};

// gets all required fields to mutate / create products on shopify
export async function getProductCreationData(
  products: CoreProductProps[],
  sessionid: string,
  graphql: GraphQL,
) {
  try {
    const productIds = products.map((product) => product.id);
    const response = await graphql(
      `
        mutation bulkOperationGetProductDetailsQuery($query: String!) {
          bulkOperationRunQuery(query: $query) {
            bulkOperation {
              id
              status
            }
            userErrors {
              field
              message
            }
          }
        }
      `,
      {
        variables: {
          query: ProductsQuery(productIds),
        },
      },
    );

    const data = await response.json();
    console.log(data);
  } catch {}
}
