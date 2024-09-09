import { nodesFromEdges } from '@shopify/admin-graphql-api-utilities';
import { type GraphQL } from '~/types';
import getQueryStr from '../util/getQueryStr';
import type { ProductInformationForPrismaQueryQuery } from '~/types/admin.generated';
import { errorHandler } from '~/services/util';
import { CREATE_PRODUCT_MUTATION, PRODUCT_QUERY } from './graphql';
import type { Prisma } from '@prisma/client';
import type { ProductStatus } from '~/types/admin.types';
import getUserError from '../util/getUserError';

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
      variantsCount,
    } = product;

    const imagesFormatted: ImageProps[] = [];
    let currentPos = 0;
    product.images.edges.forEach(({ node: image }) => {
      imagesFormatted.push({
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
        url: media.originalSource.url,
        alt: media.alt ?? '',
        mediaContentType: media.mediaContentType,
        position: currentPos,
      });
      currentPos += 1;
    });

    return {
      shopifyProductId: id,
      priceListId,
      categoryId: category?.id ?? null,
      productType: productType,
      description,
      descriptionHtml: descriptionHtml as string,
      status,
      vendor,
      title,
      variantsCount: variantsCount?.count ?? 1,
      ...(imagesFormatted.length > 0 && {
        images: { create: imagesFormatted },
      }),
    };
  });
}

// https://shopify.dev/docs/api/admin-graphql/2024-07/input-objects/ProductInput
// helper functions for creating product with variants and image
export async function createProduct(
  product: ProductWithVariantImagePriceList,
  graphql: GraphQL,
) {
  try {
    const { categoryId, title, descriptionHtml, status, vendor } = product;
    const productCreateInput = {
      category: categoryId,
      title,
      descriptionHtml,
      status: status as ProductStatus,
      vendor,
    };
    const createProductResponse = await graphql(CREATE_PRODUCT_MUTATION, {
      variables: {
        input: productCreateInput,
      },
    });
    const { data } = await createProductResponse.json();
    const productCreate = data?.productCreate;

    if (
      !productCreate ||
      !productCreate.product ||
      (productCreate.userErrors && productCreate.userErrors.length > 0)
    ) {
      throw getUserError({
        defaultMessage: 'Data is missing from creating product on shopify.',
        userErrors: productCreate?.userErrors,
        parentFunc: createProduct,
        data: { product },
      });
    }

    const newProductId = productCreate.product.id;
    return newProductId;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to create product on Shopify.',
      createProduct,
      { product },
    );
  }
}
