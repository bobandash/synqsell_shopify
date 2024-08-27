import { nodesFromEdges } from '@shopify/admin-graphql-api-utilities';
import { type GraphQL } from '~/types';
import { errorHandler } from '../util';

import getQueryStr from './util/getQueryStr';
import type { ProductInformationForPrismaQueryQuery } from '~/types/admin.generated';
import { MediaContentType } from '~/types/admin.types';

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

export type ImageProps = {
  productId: string;
  url: string;
  alt: string;
  mediaContentType: MediaContentType;
  position: number;
};

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

function convertProductInfoQueryToMatchPrismaModel(
  data: ProductInformationForPrismaQueryQuery,
  priceListId: string,
) {
  const { products } = data;
  return products.edges.map(({ node: product }) => {
    const {
      id,
      category,
      productType,
      description,
      descriptionHtml,
      status,
      vendor,
      title,
    } = product;

    const imagesFormatted: ImageProps[] = [];
    let currentPos = 0;
    product.images.edges.forEach(({ node: image }) => {
      imagesFormatted.push({
        productId: id,
        url: image.url,
        alt: image.alt ?? '',
        mediaContentType: MediaContentType.Image,
        position: currentPos,
      });
      currentPos += 1;
    });

    product.media.edges.forEach(({ node: media }) => {
      if (!media.originalSource) {
        return;
      }
      imagesFormatted.push({
        productId: id,
        url: media.originalSource.url,
        alt: media.alt ?? '',
        mediaContentType: media.mediaContentType,
        position: currentPos,
      });
      currentPos += 1;
    });

    return {
      productId: id,
      priceListId,
      categoryId: category?.id ?? null,
      productType: productType,
      description,
      descriptionHtml: descriptionHtml as string,
      status,
      vendor,
      title,
      images: imagesFormatted,
    };
  });
}

export const getRelevantProductInformationForPrisma = async (
  productIds: string[],
  sessionId: string,
  priceListId: string,
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
              status
              vendor
              title
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
    if (!data) {
      return null;
    }

    const prismaDataFmt = convertProductInfoQueryToMatchPrismaModel(
      data,
      priceListId,
    );
    return prismaDataFmt;

    // clean up data to submit to create product model
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to get relevant product information from product ids.',
      getRelevantProductInformationForPrisma,
      { productIds, sessionId },
    );
  }
};
