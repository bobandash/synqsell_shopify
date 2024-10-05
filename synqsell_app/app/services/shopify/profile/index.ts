import type { GraphQL } from '~/types';
import type { ShopAddress } from '~/types/admin.types';
import { errorHandler } from '../../util';
import { GET_PROFILE_DEFAULTS } from './graphql';
import getUserError from '../util/getUserError';

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
    const response = await graphql(GET_PROFILE_DEFAULTS);
    const json = await response.json();
    const { data } = json;
    if (!data) {
      throw getUserError({
        defaultMessage: 'Could not fetch profile default values.',
        parentFunc: getProfileDefaults,
        data: {
          sessionId,
        },
      });
    }
    const { shop } = data;
    const {
      name,
      contactEmail: email,
      description,
      url,
      billingAddress,
      currencyCode,
    } = shop;

    const address = getBillingAddressStringFmt(billingAddress);
    // enforce the string type on url, graphql by default type-checks if it's a valid url
    const website = url as string;
    const biography = description || '';

    return {
      name,
      email,
      biography,
      website,
      address,
      currencyCode,
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
