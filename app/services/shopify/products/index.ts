import { nodesFromEdges } from '@shopify/admin-graphql-api-utilities';
import { type GraphQL } from '~/types';
import getQueryStr from '../util/getQueryStr';
import type { ProductInformationForPrismaQueryQuery } from '~/types/admin.generated';
import { errorHandler } from '~/services/util';
import {
  CREATE_PRODUCT_MEDIA_MUTATION,
  CREATE_PRODUCT_MUTATION,
  CREATE_VARIANTS_BULK_MUTATION,
  PRODUCT_QUERY,
} from './graphql';
import type { Prisma } from '@prisma/client';
import type {
  CountryCode,
  ProductVariantInventoryPolicy,
  WeightUnit,
  ProductStatus,
} from '~/types/admin.types';

type ProductWithVariantImagePriceList = Prisma.ProductGetPayload<{
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

type Image = Prisma.ImageGetPayload<{}>;

type Variant = Prisma.VariantGetPayload<{
  include: {
    inventoryItem: true;
    variantOptions: true;
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

export const getRelevantProductInformationForPrisma = async (
  productIds: string[],
  sessionId: string,
  priceListId: string,
  graphql: GraphQL,
) => {
  const queryStr = getQueryStr(productIds);
  const numProducts = productIds.length;
  try {
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

// https://shopify.dev/docs/api/admin-graphql/2024-07/input-objects/ProductInput
// helper functions for creating product with variants and image
// TODO: handle different errors and rollbacks
async function createProduct(
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
    if (!data || data.productCreate?.userErrors) {
      console.error(data?.productCreate?.userErrors);
      throw new Error('TODO');
    }
    const newProductId = data.productCreate?.product?.id;
    if (!newProductId) {
      throw new Error('TODO');
    }
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

async function createProductMedia(
  images: Image[],
  productId: string,
  graphql: GraphQL,
) {
  try {
    const mediaInput = images.map(({ alt, mediaContentType, url }) => {
      return {
        alt,
        mediaContentType: mediaContentType as MediaContentType,
        originalSource: url,
      };
    });

    const createProductMediaResponse = await graphql(
      CREATE_PRODUCT_MEDIA_MUTATION,
      {
        variables: {
          media: mediaInput,
          productId: productId,
        },
      },
    );

    const { data } = await createProductMediaResponse.json();
    if (!data || data.productCreateMedia?.mediaUserErrors) {
      console.error(data?.productCreateMedia?.mediaUserErrors);
      throw new Error('TODO');
    }
    const newMediaIds = data.productCreateMedia?.media?.map(({ id }) => id);
    if (!newMediaIds) {
      throw new Error('TODO');
    }
    return newMediaIds;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to create media on Shopify.',
      createProductMedia,
      { productId, images },
    );
  }
}

async function createVariants(
  variants: Variant[],
  totalVariants: number, // TODO: figure out what strategy means
  newProductId: string,
  fulfillmentId: string,
  graphql: GraphQL,
) {
  try {
    const variantInput = variants.map((variant) => {
      const { inventoryItem } = variant;
      const measurement =
        inventoryItem?.weightUnit && inventoryItem?.weightValue
          ? {
              weight: {
                unit: inventoryItem.weightUnit as WeightUnit,
                value: inventoryItem.weightValue,
              },
            }
          : undefined;

      return {
        barcode: '', // TODO: add barcode
        compareAtPrice: variant.compareAtPrice,
        inventoryItem: {
          countryCodeOfOrigin:
            (inventoryItem?.countryCodeOfOrigin as CountryCode) ?? undefined,
          harmonizedSystemCode: inventoryItem?.harmonizedSystemCode,
          measurement,
          provinceCodeOfOrigin: inventoryItem?.provinceCodeOfOrigin,
          requiresShipping: inventoryItem?.requiresShipping,
          sku: inventoryItem?.sku,
          tracked: inventoryItem?.tracked,
        },
        inventoryPolicy:
          variant.inventoryPolicy as ProductVariantInventoryPolicy,
        inventoryQuantities: [
          {
            availableQuantity: variant.inventoryQuantity ?? 0,
            locationId: fulfillmentId,
          },
        ],
        optionValues: variant.variantOptions.map((option) => {
          return {
            name: option.name,
            optionName: option.value,
          };
        }),
        price: variant.price,
        taxCode: variant.taxCode,
        taxable: variant.taxable,
      };
    });

    const createVariantResponse = await graphql(CREATE_VARIANTS_BULK_MUTATION, {
      variables: {
        productId: newProductId,
        variants: variantInput,
      },
    });

    const { data } = await createVariantResponse.json();
    if (!data || data.productVariantsBulkCreate?.userErrors) {
      console.error(data?.productVariantsBulkCreate?.userErrors);
      throw new Error('TODO');
    }
    const newVariantIds = data.productVariantsBulkCreate?.productVariants?.map(
      ({ id }) => id,
    );
    if (!newVariantIds) {
      throw new Error('TODO');
    }
    return newVariantIds;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to create variants on Shopify.',
      createProductMedia,
      { variants, newProductId },
    );
  }
}

export async function createEntireProductShopify(
  product: ProductWithVariantImagePriceList,
  fulfillmentId: string,
  graphql: GraphQL,
) {
  // get all data for creating a product
  try {
    const { images, variants, variantsCount } = product;
    const newProductId = await createProduct(product, graphql);
    const newImageIds = await createProductMedia(images, newProductId, graphql);
    const newVariantIds = await createVariants(
      variants,
      variantsCount,
      newProductId,
      fulfillmentId,
      graphql,
    );
    return {
      newProductId,
      newImageIds,
      newVariantIds,
    };
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to create entire product with variant and images',
      createEntireProductShopify,
      {
        product,
        fulfillmentId,
      },
    );
  }
}