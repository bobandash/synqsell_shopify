/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */
import type * as AdminTypes from './admin.types';

export type FulfillmentServicesQueryQueryVariables = AdminTypes.Exact<{ [key: string]: never; }>;


export type FulfillmentServicesQueryQuery = { shop: { fulfillmentServices: Array<Pick<AdminTypes.FulfillmentService, 'id' | 'serviceName'>> } };

export type FulfillmentServiceDeleteMutationVariables = AdminTypes.Exact<{
  id: AdminTypes.Scalars['ID']['input'];
}>;


export type FulfillmentServiceDeleteMutation = { fulfillmentServiceDelete?: AdminTypes.Maybe<(
    Pick<AdminTypes.FulfillmentServiceDeletePayload, 'deletedId'>
    & { userErrors: Array<Pick<AdminTypes.UserError, 'field' | 'message'>> }
  )> };

export type FulfillmentServiceCreateMutationVariables = AdminTypes.Exact<{
  name: AdminTypes.Scalars['String']['input'];
  callbackUrl: AdminTypes.Scalars['URL']['input'];
  trackingSupport: AdminTypes.Scalars['Boolean']['input'];
}>;


export type FulfillmentServiceCreateMutation = { fulfillmentServiceCreate?: AdminTypes.Maybe<{ fulfillmentService?: AdminTypes.Maybe<Pick<AdminTypes.FulfillmentService, 'id' | 'serviceName' | 'callbackUrl' | 'trackingSupport'>>, userErrors: Array<Pick<AdminTypes.UserError, 'field' | 'message'>> }> };

export type ProfileQueryQueryVariables = AdminTypes.Exact<{ [key: string]: never; }>;


export type ProfileQueryQuery = { shop: (
    Pick<AdminTypes.Shop, 'name' | 'contactEmail' | 'description' | 'url'>
    & { billingAddress: Pick<AdminTypes.ShopAddress, 'city' | 'provinceCode' | 'country'> }
  ) };

export type ProductUrlsQueryQueryVariables = AdminTypes.Exact<{
  first?: AdminTypes.InputMaybe<AdminTypes.Scalars['Int']['input']>;
  query?: AdminTypes.InputMaybe<AdminTypes.Scalars['String']['input']>;
}>;


export type ProductUrlsQueryQuery = { products: { edges: Array<{ node: Pick<AdminTypes.Product, 'id' | 'onlineStoreUrl'> }> } };

interface GeneratedQueryTypes {
  "\n      query FulfillmentServicesQuery {\n        shop {\n          fulfillmentServices {\n            id\n            serviceName\n          }\n        }\n      }\n    ": {return: FulfillmentServicesQueryQuery, variables: FulfillmentServicesQueryQueryVariables},
  "\n      query profileQuery {\n        shop {\n          name\n          contactEmail\n          description\n          url\n          billingAddress {\n            city\n            provinceCode\n            country\n          }\n        }\n      }\n    ": {return: ProfileQueryQuery, variables: ProfileQueryQueryVariables},
  "\n        query ProductUrlsQuery($first: Int, $query: String) {\n          products(first: $first, query: $query) {\n            edges {\n              node {\n                id\n                onlineStoreUrl\n              }\n            }\n          }\n        }\n      ": {return: ProductUrlsQueryQuery, variables: ProductUrlsQueryQueryVariables},
}

interface GeneratedMutationTypes {
  "\n        mutation fulfillmentServiceDelete($id: ID!) {\n          fulfillmentServiceDelete(id: $id) {\n            deletedId\n            userErrors {\n              field\n              message\n            }\n          }\n        }\n      ": {return: FulfillmentServiceDeleteMutation, variables: FulfillmentServiceDeleteMutationVariables},
  "\n        mutation fulfillmentServiceCreate(\n          $name: String!\n          $callbackUrl: URL!\n          $trackingSupport: Boolean!\n        ) {\n          fulfillmentServiceCreate(\n            name: $name\n            callbackUrl: $callbackUrl\n            trackingSupport: $trackingSupport\n          ) {\n            fulfillmentService {\n              id\n              serviceName\n              callbackUrl\n              trackingSupport\n            }\n            userErrors {\n              field\n              message\n            }\n          }\n        }\n      ": {return: FulfillmentServiceCreateMutation, variables: FulfillmentServiceCreateMutationVariables},
}
declare module '@shopify/admin-api-client' {
  type InputMaybe<T> = AdminTypes.InputMaybe<T>;
  interface AdminQueries extends GeneratedQueryTypes {}
  interface AdminMutations extends GeneratedMutationTypes {}
}
