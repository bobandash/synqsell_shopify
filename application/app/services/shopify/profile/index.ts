import type { GraphQL } from '~/types';
import type { ShopAddress } from '~/types/admin.types';
import { GET_PROFILE_DEFAULTS } from './graphql';
import { queryInternalStoreAdminAPI } from '../utils';
import type { ProfileDefaultsQuery } from '~/types/admin.generated';

export type ProfileDefaults = {
  name: string;
  email: string;
  biography: string;
  website: string;
  address: string;
  currencyCode: string;
};

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
export async function getProfileDefaults(
  graphql: GraphQL,
): Promise<ProfileDefaults> {
  const {
    shop: {
      name,
      contactEmail: email,
      description: biography,
      url: website,
      billingAddress,
      currencyCode,
    },
  } = await queryInternalStoreAdminAPI<ProfileDefaultsQuery>(
    graphql,
    GET_PROFILE_DEFAULTS,
    {},
  );
  const address = getBillingAddressStringFmt(billingAddress);

  return {
    name,
    email,
    biography: biography ?? '',
    website,
    address,
    currencyCode,
  };
}
