/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */
import type * as AdminTypes from './admin.types';

export type PopulateProductMutationVariables = AdminTypes.Exact<{
  input: AdminTypes.ProductInput;
}>;


export type PopulateProductMutation = { productCreate?: AdminTypes.Maybe<{ product?: AdminTypes.Maybe<(
      Pick<AdminTypes.Product, 'id' | 'title' | 'handle' | 'status'>
      & { variants: { edges: Array<{ node: Pick<AdminTypes.ProductVariant, 'id' | 'price' | 'barcode' | 'createdAt'> }> } }
    )> }> };

export type ShopifyRemixTemplateUpdateVariantMutationVariables = AdminTypes.Exact<{
  input: AdminTypes.ProductVariantInput;
}>;


export type ShopifyRemixTemplateUpdateVariantMutation = { productVariantUpdate?: AdminTypes.Maybe<{ productVariant?: AdminTypes.Maybe<Pick<AdminTypes.ProductVariant, 'id' | 'price' | 'barcode' | 'createdAt'>> }> };

export type FulfillmentServiceCreateMutationVariables = AdminTypes.Exact<{
  name: AdminTypes.Scalars['String']['input'];
  callbackUrl: AdminTypes.Scalars['URL']['input'];
  trackingSupport: AdminTypes.Scalars['Boolean']['input'];
}>;


export type FulfillmentServiceCreateMutation = { fulfillmentServiceCreate?: AdminTypes.Maybe<{ fulfillmentService?: AdminTypes.Maybe<Pick<AdminTypes.FulfillmentService, 'id' | 'serviceName' | 'callbackUrl' | 'trackingSupport'>>, userErrors: Array<Pick<AdminTypes.UserError, 'field' | 'message'>> }> };

export type SupplementFulfillmentServiceQueryVariables = AdminTypes.Exact<{
  id: AdminTypes.Scalars['ID']['input'];
}>;


export type SupplementFulfillmentServiceQuery = { fulfillmentService?: AdminTypes.Maybe<Pick<AdminTypes.FulfillmentService, 'id' | 'serviceName'>> };

interface GeneratedQueryTypes {
  "\n      query supplementFulfillmentService($id: ID!) {\n        fulfillmentService(id: $id) {\n          id\n          serviceName\n        }\n      }\n    ": {return: SupplementFulfillmentServiceQuery, variables: SupplementFulfillmentServiceQueryVariables},
}

interface GeneratedMutationTypes {
  "#graphql\n      mutation populateProduct($input: ProductInput!) {\n        productCreate(input: $input) {\n          product {\n            id\n            title\n            handle\n            status\n            variants(first: 10) {\n              edges {\n                node {\n                  id\n                  price\n                  barcode\n                  createdAt\n                }\n              }\n            }\n          }\n        }\n      }": {return: PopulateProductMutation, variables: PopulateProductMutationVariables},
  "#graphql\n      mutation shopifyRemixTemplateUpdateVariant($input: ProductVariantInput!) {\n        productVariantUpdate(input: $input) {\n          productVariant {\n            id\n            price\n            barcode\n            createdAt\n          }\n        }\n      }": {return: ShopifyRemixTemplateUpdateVariantMutation, variables: ShopifyRemixTemplateUpdateVariantMutationVariables},
  "\n        mutation fulfillmentServiceCreate(\n          $name: String!\n          $callbackUrl: URL!\n          $trackingSupport: Boolean!\n        ) {\n          fulfillmentServiceCreate(\n            name: $name\n            callbackUrl: $callbackUrl\n            trackingSupport: $trackingSupport\n          ) {\n            fulfillmentService {\n              id\n              serviceName\n              callbackUrl\n              trackingSupport\n            }\n            userErrors {\n              field\n              message\n            }\n          }\n        }\n      ": {return: FulfillmentServiceCreateMutation, variables: FulfillmentServiceCreateMutationVariables},
}
declare module '@shopify/admin-api-client' {
  type InputMaybe<T> = AdminTypes.InputMaybe<T>;
  interface AdminQueries extends GeneratedQueryTypes {}
  interface AdminMutations extends GeneratedMutationTypes {}
}
