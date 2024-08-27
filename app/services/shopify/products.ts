import { nodesFromEdges } from '@shopify/admin-graphql-api-utilities';
import { type GraphQL } from '~/types';
import { errorHandler } from '../util';

import getQueryStr from './util/getQueryStr';

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

export const getRelevantProductInformationForPrisma = async (
  productIds: string[],
  sessionId: string,
  graphql: GraphQL,
) => {
  const queryStr = getQueryStr(productIds);
  const numProducts = productIds.length;
  try {
    const PRODUCT_QUERY = `#graphql
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
              seo {
                description
                title
              }
              status
              vendor
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

    const response = await graphql(PRODUCT_QUERY, {
      variables: {
        query: queryStr,
        first: numProducts,
      },
    });
    const { data } = await response.json();
    if (data) {
      return data;
    }
    return null;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to get relevant product information from product ids.',
      getRelevantProductInformationForPrisma,
      { productIds, sessionId },
    );
  }
};
