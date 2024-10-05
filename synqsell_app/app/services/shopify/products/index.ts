import { nodesFromEdges } from '@shopify/admin-graphql-api-utilities';
import { type GraphQL } from '~/types';
import getQueryStr from '../util/getQueryStr';
import type {
  ProductCreateMutation,
  ProductBasicInfoQuery,
  ProductCreationInformationQuery,
  ProductMediaQuery,
} from '~/types/admin.generated';
import { errorHandler } from '~/services/util';
import {
  CREATE_PRODUCT_MUTATION,
  PRODUCT_BASIC_INFO_QUERY,
  PRODUCT_CREATION_DETAILS_WITHOUT_MEDIA_QUERY,
  PRODUCT_GET_MEDIA,
} from './graphql';
import type { Prisma } from '@prisma/client';
import {
  fetchAndValidateGraphQLData,
  mutateGraphQLAdminData,
  queryGraphQLAdminData,
} from '../util';
import type { CreateMediaInput, ProductInput } from '~/types/admin.types';

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
    const data = await queryGraphQLAdminData<ProductBasicInfoQuery>(
      graphql,
      PRODUCT_BASIC_INFO_QUERY,
      { query: queryStr, first: take },
    );
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
    const data = await fetchAndValidateGraphQLData<ProductBasicInfoQuery>(
      shop,
      accessToken,
      PRODUCT_BASIC_INFO_QUERY,
      variables,
    );
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

export async function getProductAndMediaCreationInputWithAccessToken(
  shopifyProductId: string,
  shop: string,
  accessToken: string,
  supplierName: string,
) {
  try {
    const productCreationInfoMinusMediaData: ProductCreationInformationQuery =
      await fetchAndValidateGraphQLData(
        shop,
        accessToken,
        PRODUCT_CREATION_DETAILS_WITHOUT_MEDIA_QUERY,
        { id: shopifyProductId },
      );

    const productInputFields = getProductCreationInputFields(
      productCreationInfoMinusMediaData,
      supplierName,
    );

    // get product media input fields
    let mediaInputFields = null;
    const mediaCount =
      productCreationInfoMinusMediaData.product?.mediaCount?.count ?? 0;
    if (mediaCount > 0) {
      const mediaData = await fetchAndValidateGraphQLData<ProductMediaQuery>(
        shop,
        accessToken,
        PRODUCT_GET_MEDIA,
        { id: shopifyProductId, first: 1 },
      );
      mediaInputFields = getProductMediaCreationInputFields(mediaData);
    }

    return { productInputFields, mediaInputFields };
    // format it to match the productCreate input mutation
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to retrieve product details for creating products in another store.',
      getProductAndMediaCreationInputWithAccessToken,
      { shopifyProductId, shop },
    );
  }
}

// helper functions for getProductCreationInputWithAccessToken
function getProductCreationInputFields(
  productCreationInfoMinusMediaData: ProductCreationInformationQuery,
  supplierName: string,
) {
  const { product } = productCreationInfoMinusMediaData;
  const productionCreationInput = {
    ...(product?.category?.id && {
      category: product.category.id,
    }),
    ...(product?.descriptionHtml && {
      descriptionHtml: product.descriptionHtml,
    }),
    ...(product?.isGiftCard && {
      giftCard: product.isGiftCard,
    }),
    ...(product?.options && {
      productOptions: product.options.map((option) => {
        return {
          name: option.name,
          position: option.position,
          values: option.optionValues.map((optionValue) => {
            return {
              name: optionValue.name,
            };
          }),
        };
      }),
    }),
    ...(product?.requiresSellingPlan && {
      requiresSellingPlan: product.requiresSellingPlan,
    }),
    ...(product?.status && {
      status: product.status,
    }),
    ...(product?.title && {
      title: product.title,
    }),
    ...(product?.tags && {
      tags: product.tags,
    }),
    vendor: supplierName,
  };

  return productionCreationInput;
}

function getProductMediaCreationInputFields(mediaData: ProductMediaQuery) {
  const media = mediaData.product?.media.edges;
  if (!media) {
    return null;
  }
  return media.map(({ node }) => {
    const { alt, mediaContentType } = node;
    const mediaObj = {
      alt,
      mediaContentType,
      originalSource: '',
    };
    // TODO: figure out better way to conditional render this
    if (
      'image' in node &&
      typeof node.image === 'object' &&
      node.image !== null &&
      'url' in node.image
    ) {
      mediaObj.originalSource = node.image.url as string;
    } else if ('sources' in node) {
      mediaObj.originalSource = node.sources[0].url;
    } else if ('originUrl' in node) {
      mediaObj.originalSource = node.originUrl;
    }
    return mediaObj;
  });
}

// end helper functions for getProductCreationInputWithAccessToken
export async function createProduct(
  productInput: ProductInput,
  mediaInput: CreateMediaInput[] | null,
  graphql: GraphQL,
) {
  try {
    const data = await mutateGraphQLAdminData<ProductCreateMutation>(
      graphql,
      CREATE_PRODUCT_MUTATION,
      {
        input: productInput,
        ...(mediaInput && { media: mediaInput }),
      },
      'Failed to create product on Shopify',
    );

    const newShopifyProductId = data.productCreate?.product?.id ?? '';
    return newShopifyProductId;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to create product on shopify.',
      createProduct,
      { productInput },
    );
  }
}
