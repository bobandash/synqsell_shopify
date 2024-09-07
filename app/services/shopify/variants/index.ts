import type { GraphQL } from '~/types';
import getQueryStr from '../util/getQueryStr';
import { GET_VARIANTS } from './graphql';
import { errorHandler } from '~/services/util';
import getUserError from '../util/getUserError';

export async function getVariantInformation(
  variantIds: string[],
  sessionId: string,
  graphql: GraphQL,
) {
  try {
    const queryStr = getQueryStr(variantIds);
    const numVariants = variantIds.length;
    const response = await graphql(GET_VARIANTS, {
      variables: {
        query: queryStr,
        first: numVariants,
      },
    });
    const { data } = await response.json();
    if (!data) {
      throw getUserError({
        defaultMessage: 'Data is missing from retrieving variant information.',
        parentFunc: getVariantInformation,
        data: { variantIds, sessionId },
      });
    }
    return data;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to get relevant variant information from variant ids.',
      getVariantInformation,
      { variantIds, sessionId },
    );
  }
}
