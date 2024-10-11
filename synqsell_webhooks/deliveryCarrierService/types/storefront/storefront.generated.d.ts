/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */
import type * as StorefrontTypes from './storefront.types';

export type DeliveryGroupsFragment = { deliveryGroups: { edges: Array<{ node: { deliveryOptions: Array<(
          Pick<StorefrontTypes.CartDeliveryOption, 'title' | 'handle'>
          & { estimatedCost: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'> }
        )> } }> } };

export type CartCreateMutationVariables = StorefrontTypes.Exact<{
  input: StorefrontTypes.CartInput;
}>;


export type CartCreateMutation = { cartCreate?: StorefrontTypes.Maybe<{ cart?: StorefrontTypes.Maybe<(
      Pick<StorefrontTypes.Cart, 'id'>
      & { deliveryGroups: { edges: Array<{ node: { deliveryOptions: Array<(
              Pick<StorefrontTypes.CartDeliveryOption, 'title' | 'handle'>
              & { estimatedCost: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'> }
            )> } }> } }
    )>, userErrors: Array<Pick<StorefrontTypes.CartUserError, 'field' | 'message'>> }> };

interface GeneratedQueryTypes {
}

interface GeneratedMutationTypes {
  "#graphql\n  #graphql\n  fragment DeliveryGroups on Cart {\n    deliveryGroups(first: 10, withCarrierRates: true) {\n      edges {\n        node {\n          deliveryOptions {\n            title\n            handle\n            estimatedCost {\n              amount\n              currencyCode\n            }\n          }\n        }\n      }\n    }\n  }\n\n  mutation cartCreate($input: CartInput!) {\n    cartCreate(input: $input) {\n      cart {\n        id \n        ...DeliveryGroups @defer\n      }\n      userErrors {\n        field\n        message\n      }\n    }\n  }\n": {return: CartCreateMutation, variables: CartCreateMutationVariables},
}
declare module '@shopify/storefront-api-client' {
  type InputMaybe<T> = StorefrontTypes.InputMaybe<T>;
  interface StorefrontQueries extends GeneratedQueryTypes {}
  interface StorefrontMutations extends GeneratedMutationTypes {}
}
