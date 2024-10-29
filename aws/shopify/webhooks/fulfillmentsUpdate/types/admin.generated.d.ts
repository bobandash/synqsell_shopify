/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */
import type * as AdminTypes from './admin.types';

export type FulfillmentCancelMutationVariables = AdminTypes.Exact<{
  id: AdminTypes.Scalars['ID']['input'];
}>;


export type FulfillmentCancelMutation = { fulfillmentCancel?: AdminTypes.Maybe<{ fulfillment?: AdminTypes.Maybe<Pick<AdminTypes.Fulfillment, 'id' | 'status'>>, userErrors: Array<Pick<AdminTypes.UserError, 'field' | 'message'>> }> };

export type FulfillmentCreateV2MutationVariables = AdminTypes.Exact<{
  fulfillment: AdminTypes.FulfillmentV2Input;
}>;


export type FulfillmentCreateV2Mutation = { fulfillmentCreateV2?: AdminTypes.Maybe<{ fulfillment?: AdminTypes.Maybe<Pick<AdminTypes.Fulfillment, 'id' | 'status'>>, userErrors: Array<Pick<AdminTypes.UserError, 'field' | 'message'>> }> };

export type FulfillmentOrderOpenMutationVariables = AdminTypes.Exact<{
  id: AdminTypes.Scalars['ID']['input'];
}>;


export type FulfillmentOrderOpenMutation = { fulfillmentOrderOpen?: AdminTypes.Maybe<{ fulfillmentOrder?: AdminTypes.Maybe<Pick<AdminTypes.FulfillmentOrder, 'id'>>, userErrors: Array<Pick<AdminTypes.UserError, 'field' | 'message'>> }> };

export type AppUsageRecordCreateMutationVariables = AdminTypes.Exact<{
  description: AdminTypes.Scalars['String']['input'];
  price: AdminTypes.MoneyInput;
  subscriptionLineItemId: AdminTypes.Scalars['ID']['input'];
}>;


export type AppUsageRecordCreateMutation = { appUsageRecordCreate?: AdminTypes.Maybe<{ userErrors: Array<Pick<AdminTypes.UserError, 'field' | 'message'>>, appUsageRecord?: AdminTypes.Maybe<Pick<AdminTypes.AppUsageRecord, 'id'>> }> };

interface GeneratedQueryTypes {
}

interface GeneratedMutationTypes {
  "#graphql\n  mutation fulfillmentCancel($id: ID!) {\n    fulfillmentCancel(id: $id) {\n      fulfillment {\n        id\n        status\n      }\n      userErrors {\n        field\n        message\n      }\n    }\n  }\n": {return: FulfillmentCancelMutation, variables: FulfillmentCancelMutationVariables},
  "#graphql\n  mutation fulfillmentCreateV2($fulfillment: FulfillmentV2Input!) {\n    fulfillmentCreateV2(fulfillment: $fulfillment) {\n      fulfillment {\n        id\n        status\n      }\n      userErrors {\n        field\n        message\n      }\n    }\n  }\n": {return: FulfillmentCreateV2Mutation, variables: FulfillmentCreateV2MutationVariables},
  "#graphql\n  mutation fulfillmentOrderOpen($id: ID!) {\n    fulfillmentOrderOpen(id: $id) {\n      fulfillmentOrder {\n        id\n      }\n      userErrors {\n        field\n        message\n      }\n    }\n  }\n": {return: FulfillmentOrderOpenMutation, variables: FulfillmentOrderOpenMutationVariables},
  "#graphql\n  mutation appUsageRecordCreate($description: String!, $price: MoneyInput!, $subscriptionLineItemId: ID!) {\n    appUsageRecordCreate(description: $description, price: $price, subscriptionLineItemId: $subscriptionLineItemId) {\n      userErrors {\n        field\n        message\n      }\n      appUsageRecord {\n        id\n      }\n    }\n  }\n": {return: AppUsageRecordCreateMutation, variables: AppUsageRecordCreateMutationVariables},
}
declare module '@shopify/admin-api-client' {
  type InputMaybe<T> = AdminTypes.InputMaybe<T>;
  interface AdminQueries extends GeneratedQueryTypes {}
  interface AdminMutations extends GeneratedMutationTypes {}
}
