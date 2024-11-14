import { nodesFromEdges } from '@shopify/admin-graphql-api-utilities';
import { type GraphQL } from '~/types';
import getQueryStr from '../utils/getQueryStr';
import {
  CREATE_PRODUCT_MUTATION,
  GET_PRODUCT_URL,
  PRODUCT_BASIC_INFO_QUERY,
  PRODUCT_CREATION_DETAILS_WITHOUT_MEDIA_QUERY,
  PRODUCT_GET_MEDIA,
} from './graphql';
import type { Prisma } from '@prisma/client';
import {
  queryExternalStoreAdminAPI,
  mutateInternalStoreAdminAPI,
  queryInternalStoreAdminAPI,
} from '../utils';
import { type CreateMediaInput, type ProductInput } from '~/types/admin.types';
import type {
  ProductBasicInfoQuery,
  ProductCreateMutation,
  ProductCreationInformationQuery,
  ProductMediaQuery,
  ProductUrlQuery,
} from './types';

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
  productIds: string[],
) {
  if (productIds.length === 0) {
    return {};
  }
  const numProducts = productIds.length;
  const queryStr = getQueryStr(productIds);
  const data = await queryInternalStoreAdminAPI<ProductUrlQuery>(
    graphql,
    GET_PRODUCT_URL,
    {
      first: numProducts,
      query: queryStr,
    },
  );
  const edges = data.products.edges;
  const nodes = nodesFromEdges(edges);
  const idToStoreUrl = nodes.reduce((acc, node) => {
    const { id, onlineStoreUrl } = node;
    return {
      ...acc,
      [id]: onlineStoreUrl,
    };
  }, {});

  return idToStoreUrl;
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
  const queryStr = getQueryStr(shopifyProductIds);
  const data = await queryInternalStoreAdminAPI<ProductBasicInfoQuery>(
    graphql,
    PRODUCT_BASIC_INFO_QUERY,
    { query: queryStr, first: take },
  );
  const flattenedData = flattenBasicProductInfo(data);
  return flattenedData;
}

export async function getBasicProductDetailsWithAccessToken(
  shopifyProductIds: string[],
  take: number,
  shop: string,
  accessToken: string,
) {
  const queryStr = getQueryStr(shopifyProductIds);
  const variables = {
    query: queryStr,
    first: take,
  };
  const data = await queryExternalStoreAdminAPI<ProductBasicInfoQuery>(
    shop,
    accessToken,
    PRODUCT_BASIC_INFO_QUERY,
    variables,
  );
  const flattenedData = flattenBasicProductInfo(data);
  return flattenedData;
}

export async function getProductAndMediaCreationInputWithAccessToken(
  shopifyProductId: string,
  shop: string,
  accessToken: string,
  supplierName: string,
) {
  const productCreationInfoMinusMediaData: ProductCreationInformationQuery =
    await queryExternalStoreAdminAPI(
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
    const mediaData = await queryExternalStoreAdminAPI<ProductMediaQuery>(
      shop,
      accessToken,
      PRODUCT_GET_MEDIA,
      { id: shopifyProductId, first: 1 },
    );
    mediaInputFields = getProductMediaCreationInputFields(mediaData);
  }

  return { productInputFields, mediaInputFields };
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
  const data = await mutateInternalStoreAdminAPI<ProductCreateMutation>(
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
}
