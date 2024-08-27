import type { GraphQL } from '~/types';
import { errorHandler } from '../util';
import getQueryStr from './util/getQueryStr';

export async function getRelevantVariantInformationForPrisma(
  variantIds: string[],
  sessionId: string,
  graphql: GraphQL,
) {
  try {
    const queryStr = getQueryStr(variantIds);
    const numVariants = variantIds.length;
    const VARIANT_QUERY = `#graphql 
      query VariantInformationForPrismaQuery($query: String, $first: Int){
        productVariants(query: $query, first: $first){
          edges {
            node {
              id
              barcode,
              compareAtPrice
              inventoryItem {
                countryCodeOfOrigin
                harmonizedSystemCode
                measurement {
                  weight {
                    unit
                    value
                  }
                }
                provinceCodeOfOrigin
                requiresShipping
                sku
                tracked
              }
              inventoryPolicy
              inventoryQuantity
              price
              taxable
              taxCode
              selectedOptions {
                name
                value
              }
            }
          }
        }
      }
    `;

    const response = await graphql(VARIANT_QUERY, {
      variables: {
        query: queryStr,
        first: numVariants,
      },
    });
    const { data } = await response.json();
    if (!data) {
      return null;
    }
    return data;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to get relevant product information from variant ids.',
      getRelevantVariantInformationForPrisma,
      { variantIds, sessionId },
    );
  }
}
