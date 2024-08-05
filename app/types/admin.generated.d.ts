/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */
import type * as AdminTypes from './admin.types';

export type FulfillmentServiceCreateMutationVariables = AdminTypes.Exact<{
  name: AdminTypes.Scalars['String']['input'];
  callbackUrl: AdminTypes.Scalars['URL']['input'];
  trackingSupport: AdminTypes.Scalars['Boolean']['input'];
}>;


export type FulfillmentServiceCreateMutation = { fulfillmentServiceCreate?: AdminTypes.Maybe<{ fulfillmentService?: AdminTypes.Maybe<Pick<AdminTypes.FulfillmentService, 'id' | 'serviceName' | 'callbackUrl' | 'trackingSupport'>>, userErrors: Array<Pick<AdminTypes.UserError, 'field' | 'message'>> }> };

export type FulfillmentServiceDeleteMutationVariables = AdminTypes.Exact<{
  id: AdminTypes.Scalars['ID']['input'];
}>;


export type FulfillmentServiceDeleteMutation = { fulfillmentServiceDelete?: AdminTypes.Maybe<(
    Pick<AdminTypes.FulfillmentServiceDeletePayload, 'deletedId'>
    & { userErrors: Array<Pick<AdminTypes.UserError, 'field' | 'message'>> }
  )> };

export type SupplementFulfillmentServiceQueryQueryVariables = AdminTypes.Exact<{
  id: AdminTypes.Scalars['ID']['input'];
}>;


export type SupplementFulfillmentServiceQueryQuery = { fulfillmentService?: AdminTypes.Maybe<Pick<AdminTypes.FulfillmentService, 'id' | 'serviceName'>> };

interface GeneratedQueryTypes {
  "\n        query supplementFulfillmentServiceQuery($id: ID!) {\n          fulfillmentService(id: $id) {\n            id\n            serviceName\n          }\n        }\n      ": {return: SupplementFulfillmentServiceQueryQuery, variables: SupplementFulfillmentServiceQueryQueryVariables},
}

interface GeneratedMutationTypes {
  "\n        mutation fulfillmentServiceCreate(\n          $name: String!\n          $callbackUrl: URL!\n          $trackingSupport: Boolean!\n        ) {\n          fulfillmentServiceCreate(\n            name: $name\n            callbackUrl: $callbackUrl\n            trackingSupport: $trackingSupport\n          ) {\n            fulfillmentService {\n              id\n              serviceName\n              callbackUrl\n              trackingSupport\n            }\n            userErrors {\n              field\n              message\n            }\n          }\n        }\n      ": {return: FulfillmentServiceCreateMutation, variables: FulfillmentServiceCreateMutationVariables},
  "\n        mutation fulfillmentServiceDelete($id: ID!) {\n          fulfillmentServiceDelete(id: $id) {\n            deletedId\n            userErrors {\n              field\n              message\n            }\n          }\n        }\n      ": {return: FulfillmentServiceDeleteMutation, variables: FulfillmentServiceDeleteMutationVariables},
}
declare module '@shopify/admin-api-client' {
  type InputMaybe<T> = AdminTypes.InputMaybe<T>;
  interface AdminQueries extends GeneratedQueryTypes {}
  interface AdminMutations extends GeneratedMutationTypes {}
}
