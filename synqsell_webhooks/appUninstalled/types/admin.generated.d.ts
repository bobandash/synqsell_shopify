/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */
import type * as AdminTypes from './admin.types';

export type UpdateProductStatusMutationVariables = AdminTypes.Exact<{
  input: AdminTypes.ProductInput;
}>;


export type UpdateProductStatusMutation = { productUpdate?: AdminTypes.Maybe<{ product?: AdminTypes.Maybe<Pick<AdminTypes.Product, 'id' | 'status'>>, userErrors: Array<Pick<AdminTypes.UserError, 'field' | 'message'>> }> };

interface GeneratedQueryTypes {
}

interface GeneratedMutationTypes {
  "#graphql\n  mutation UpdateProductStatus($input: ProductInput!) {\n    productUpdate(input: $input) {\n      product {\n        id\n        status\n      }\n      userErrors {\n        field\n        message\n      }\n    }\n  }\n": {return: UpdateProductStatusMutation, variables: UpdateProductStatusMutationVariables},
}
declare module '@shopify/admin-api-client' {
  type InputMaybe<T> = AdminTypes.InputMaybe<T>;
  interface AdminQueries extends GeneratedQueryTypes {}
  interface AdminMutations extends GeneratedMutationTypes {}
}
