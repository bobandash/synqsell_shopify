import { nodesFromEdges } from '@shopify/admin-graphql-api-utilities';
import { type GraphQL } from '~/types';
import getQueryStr from '../util/getQueryStr';
import type { ProductBasicInfoQuery } from '~/types/admin.generated';
import { errorHandler } from '~/services/util';
import { PRODUCT_BASIC_INFO_QUERY } from './graphql';
import type { Prisma } from '@prisma/client';
import getUserError from '../util/getUserError';
import fetchGraphQL from '../util/fetchGraphql';

// the reality is

export type ProductWithVariantImagePriceList = Prisma.ProductGetPayload<{
  include: {
    priceList: true;
    images: true;
    variants: {
      include: {
        inventoryItem: true;
        variantOptions: true;
      };
    };
  };
}>;

enum MediaContentType {
  ExternalVideo = 'EXTERNAL_VIDEO',
  Image = 'IMAGE',
  Model_3D = 'MODEL_3D',
  Video = 'VIDEO',
}

export type ImageProps = {
  url: string;
  alt: string;
  mediaContentType: MediaContentType;
  position: number;
};

export type BasicProductDetails = {
  productId: string;
  title: string;
  mediaId: string | null;
  mediaAlt: string | null;
  mediaImageUrl: any;
  variantsCount: number;
  onlineStoreUrl: any;
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

// helper function for getBasicProductDetails
function flattenBasicProductInfo(data: ProductBasicInfoQuery) {
  const flattenedProducts = data.products.edges.map((edge) => {
    const product = edge.node;
    const media = product.media.edges[0]?.node;
    return {
      productId: product.id,
      title: product.title,
      mediaId: media?.id || null,
      mediaAlt: media?.alt || null,
      mediaImageUrl: media?.preview?.image?.url || null,
      variantsCount: product.variantsCount?.count || 1,
      onlineStoreUrl: product.onlineStoreUrl ?? null,
    };
  });
  return flattenedProducts;
}

export async function getBasicProductDetails(
  shopifyProductIds: string[],
  take: number,
  graphql: GraphQL,
): Promise<BasicProductDetails[]> {
  try {
    const queryStr = getQueryStr(shopifyProductIds);
    const response = await graphql(PRODUCT_BASIC_INFO_QUERY, {
      variables: {
        query: queryStr,
        first: take,
      },
    });
    const { data } = await response.json();
    if (!data) {
      throw getUserError({
        defaultMessage: 'Could not fetch product details.',
        parentFunc: getBasicProductDetails,
        data: {
          shopifyProductIds,
          take,
        },
      });
    }
    const flattenedData = flattenBasicProductInfo(data);
    return flattenedData;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to retrieve basic product details.',
      getBasicProductDetails,
      { shopifyProductIds, take },
    );
  }
}

export async function getBasicProductDetailsWithAccessToken(
  shopifyProductIds: string[],
  take: number,
  shop: string,
  accessToken: string,
) {
  try {
    const queryStr = getQueryStr(shopifyProductIds);
    const variables = {
      query: queryStr,
      first: take,
    };
    const response = await fetchGraphQL(
      shop,
      accessToken,
      PRODUCT_BASIC_INFO_QUERY,
      variables,
    );
    const { data } = await response.json();
    if (!data) {
      throw getUserError({
        defaultMessage: 'Could not fetch product details.',
        parentFunc: getBasicProductDetails,
        data: {
          shopifyProductIds,
          take,
        },
      });
    }
    const flattenedData = flattenBasicProductInfo(data);
    return flattenedData;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to retrieve basic product details.',
      getBasicProductDetailsWithAccessToken,
      { shopifyProductIds, take },
    );
  }
}
