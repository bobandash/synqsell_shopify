import type { GraphQL } from '~/types';
import type { ShopAddress } from '~/types/admin.types';
import { errorHandler } from '../util';
import logger from '~/logger';
import createHttpError from 'http-errors';

// helper function for getProfileDefaultsShopify
function getBillingAddressStringFmt(
  billingAddress: Pick<ShopAddress, 'city' | 'provinceCode' | 'country'>,
) {
  const addressArr: string[] = [];
  Object.values(billingAddress).forEach((value) => {
    if (value) {
      addressArr.push(value);
    }
  });
  if (!addressArr) {
    return '';
  }
  const address = addressArr.join(', ');
  return address;
}

// retrieves the default profile details from shopify
export async function getProfileDefaults(sessionId: string, graphql: GraphQL) {
  try {
    const response = await graphql(`
      query profileQuery {
        shop {
          name
          contactEmail
          description
          url
          billingAddress {
            city
            provinceCode
            country
          }
        }
      }
    `);
    const json = await response.json();
    const { data } = json;
    if (!data) {
      const errorMessage =
        'Did not receive any information from querying profile';
      logger.error(errorMessage, {
        sessionId,
      });
      throw new createHttpError.BadRequest(errorMessage);
    }
    const { shop } = data;
    const {
      name,
      contactEmail: email,
      description,
      url,
      billingAddress,
    } = shop;

    const address = getBillingAddressStringFmt(billingAddress);
    const website = url as string; // enforce the string type on url, graphql by default type-checks if it's a valid url
    const biography = description || '';

    return {
      name,
      email,
      biography,
      website,
      address,
    };
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to retrieve default profile values from shopify.',
      getProfileDefaults,
      { sessionId },
    );
  }
}
