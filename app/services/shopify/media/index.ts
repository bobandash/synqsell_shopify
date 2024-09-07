import type { Prisma } from '@prisma/client';
import type { GraphQL } from '~/types';
import { CREATE_PRODUCT_MEDIA_MUTATION } from './graphql';
import type { MediaContentType } from '~/types/admin.types';
import { errorHandler } from '~/services/util';

type Image = Prisma.ImageGetPayload<{}>;

export async function createProductMedia(
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
    if (!data) {
      throw new Error('TODO');
    }

    if (
      data.productCreateMedia &&
      data.productCreateMedia.mediaUserErrors &&
      data.productCreateMedia.mediaUserErrors.length > 0
    ) {
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
      {},
    );
  }
}
