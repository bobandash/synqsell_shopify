/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */
import type * as AdminTypes from './admin.types';

export type CarrierServiceCreateMutationVariables = AdminTypes.Exact<{
  input: AdminTypes.DeliveryCarrierServiceCreateInput;
}>;


export type CarrierServiceCreateMutation = { carrierServiceCreate?: AdminTypes.Maybe<{ carrierService?: AdminTypes.Maybe<Pick<AdminTypes.DeliveryCarrierService, 'id' | 'name'>>, userErrors: Array<Pick<AdminTypes.CarrierServiceCreateUserError, 'field' | 'message'>> }> };

export type InitialCarrierServicesQueryVariables = AdminTypes.Exact<{ [key: string]: never; }>;


export type InitialCarrierServicesQuery = { carrierServices: { edges: Array<{ node: Pick<AdminTypes.DeliveryCarrierService, 'id' | 'name' | 'callbackUrl'> }>, pageInfo: Pick<AdminTypes.PageInfo, 'hasNextPage' | 'endCursor'> } };

export type SubsequentCarrierServicesQueryVariables = AdminTypes.Exact<{
  after: AdminTypes.Scalars['String']['input'];
}>;


export type SubsequentCarrierServicesQuery = { carrierServices: { edges: Array<{ node: Pick<AdminTypes.DeliveryCarrierService, 'id' | 'name' | 'callbackUrl'> }>, pageInfo: Pick<AdminTypes.PageInfo, 'hasNextPage' | 'endCursor'> } };

export type AllFulfillmentServicesQueryVariables = AdminTypes.Exact<{ [key: string]: never; }>;


export type AllFulfillmentServicesQuery = { shop: { fulfillmentServices: Array<(
      Pick<AdminTypes.FulfillmentService, 'id' | 'serviceName' | 'callbackUrl' | 'trackingSupport'>
      & { location?: AdminTypes.Maybe<Pick<AdminTypes.Location, 'id'>> }
    )> } };

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


export type FulfillmentServiceCreateMutation = { fulfillmentServiceCreate?: AdminTypes.Maybe<{ fulfillmentService?: AdminTypes.Maybe<(
      Pick<AdminTypes.FulfillmentService, 'id' | 'serviceName' | 'callbackUrl' | 'trackingSupport'>
      & { location?: AdminTypes.Maybe<Pick<AdminTypes.Location, 'id'>> }
    )>, userErrors: Array<Pick<AdminTypes.UserError, 'field' | 'message'>> }> };

export type ProfileDefaultsQueryVariables = AdminTypes.Exact<{ [key: string]: never; }>;


export type ProfileDefaultsQuery = { shop: (
    Pick<AdminTypes.Shop, 'name' | 'contactEmail' | 'description' | 'url' | 'currencyCode'>
    & { billingAddress: Pick<AdminTypes.ShopAddress, 'city' | 'provinceCode' | 'country'> }
  ) };

export type StorefrontAccessTokenCreateMutationVariables = AdminTypes.Exact<{
  input: AdminTypes.StorefrontAccessTokenInput;
}>;


export type StorefrontAccessTokenCreateMutation = { storefrontAccessTokenCreate?: AdminTypes.Maybe<{ userErrors: Array<Pick<AdminTypes.UserError, 'field' | 'message'>>, shop: Pick<AdminTypes.Shop, 'id'>, storefrontAccessToken?: AdminTypes.Maybe<(
      Pick<AdminTypes.StorefrontAccessToken, 'accessToken' | 'title'>
      & { accessScopes: Array<Pick<AdminTypes.AccessScope, 'handle'>> }
    )> }> };

export type VariantBasicInfoQueryVariables = AdminTypes.Exact<{
  query?: AdminTypes.InputMaybe<AdminTypes.Scalars['String']['input']>;
  first?: AdminTypes.InputMaybe<AdminTypes.Scalars['Int']['input']>;
}>;


export type VariantBasicInfoQuery = { productVariants: { edges: Array<{ node: Pick<AdminTypes.ProductVariant, 'id' | 'title' | 'sku'> }> } };

export type VariantCreationInformationQueryVariables = AdminTypes.Exact<{
  query?: AdminTypes.InputMaybe<AdminTypes.Scalars['String']['input']>;
  first?: AdminTypes.InputMaybe<AdminTypes.Scalars['Int']['input']>;
}>;


export type VariantCreationInformationQuery = { productVariants: { edges: Array<{ node: (
        Pick<AdminTypes.ProductVariant, 'id' | 'barcode' | 'compareAtPrice' | 'inventoryPolicy' | 'inventoryQuantity' | 'taxCode' | 'taxable'>
        & { selectedOptions: Array<Pick<AdminTypes.SelectedOption, 'name' | 'value'>>, inventoryItem: (
          Pick<AdminTypes.InventoryItem, 'countryCodeOfOrigin' | 'harmonizedSystemCode' | 'provinceCodeOfOrigin' | 'sku' | 'tracked' | 'requiresShipping'>
          & { measurement: { weight?: AdminTypes.Maybe<Pick<AdminTypes.Weight, 'unit' | 'value'>> } }
        ) }
      ) }> } };

export type VariantDeliveryProfilesQueryVariables = AdminTypes.Exact<{
  query?: AdminTypes.InputMaybe<AdminTypes.Scalars['String']['input']>;
  first?: AdminTypes.InputMaybe<AdminTypes.Scalars['Int']['input']>;
}>;


export type VariantDeliveryProfilesQuery = { productVariants: { edges: Array<{ node: { deliveryProfile?: AdminTypes.Maybe<Pick<AdminTypes.DeliveryProfile, 'id'>> } }> } };

export type ProductVariantsBulkCreateMutationVariables = AdminTypes.Exact<{
  productId: AdminTypes.Scalars['ID']['input'];
  variants: Array<AdminTypes.ProductVariantsBulkInput> | AdminTypes.ProductVariantsBulkInput;
  strategy?: AdminTypes.InputMaybe<AdminTypes.ProductVariantsBulkCreateStrategy>;
}>;


export type ProductVariantsBulkCreateMutation = { productVariantsBulkCreate?: AdminTypes.Maybe<{ product?: AdminTypes.Maybe<Pick<AdminTypes.Product, 'id'>>, productVariants?: AdminTypes.Maybe<Array<(
      Pick<AdminTypes.ProductVariant, 'id'>
      & { inventoryItem: Pick<AdminTypes.InventoryItem, 'id'> }
    )>>, userErrors: Array<Pick<AdminTypes.ProductVariantsBulkCreateUserError, 'field' | 'message'>> }> };

interface GeneratedQueryTypes {
  "#graphql\n  query initialCarrierServices {\n    carrierServices(first:5) {\n      edges {\n        node {\n          id\n          name\n          callbackUrl\n        }\n      }\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n    }\n  }\n": {return: InitialCarrierServicesQuery, variables: InitialCarrierServicesQueryVariables},
  "#graphql\n  query subsequentCarrierServices($after: String!) {\n    carrierServices(after: $after, first:5) {\n      edges {\n        node {\n          id\n          name\n          callbackUrl\n        }\n      }\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n    }\n  }\n": {return: SubsequentCarrierServicesQuery, variables: SubsequentCarrierServicesQueryVariables},
  "#graphql\n  query allFulfillmentServices {\n    shop {\n      fulfillmentServices {\n        id\n        serviceName\n        callbackUrl\n        location {\n          id\n        }\n        trackingSupport\n      }\n    }\n  }\n": {return: AllFulfillmentServicesQuery, variables: AllFulfillmentServicesQueryVariables},
  "#graphql \n  query ProfileDefaults {\n    shop {\n      name\n      contactEmail\n      description\n      url\n      currencyCode\n      billingAddress {\n        city\n        provinceCode\n        country\n      }\n    }\n  }\n": {return: ProfileDefaultsQuery, variables: ProfileDefaultsQueryVariables},
  "#graphql \n  query VariantBasicInfo($query: String, $first: Int){\n    productVariants(query: $query, first: $first){\n      edges {\n        node {\n          id\n          title\n          sku\n        }\n      }\n    }\n  }\n": {return: VariantBasicInfoQuery, variables: VariantBasicInfoQueryVariables},
  "#graphql \n  query variantCreationInformation($query: String, $first: Int){\n    productVariants(query: $query, first: $first){\n      edges {\n        node {\n          id\n          barcode\n          compareAtPrice\n          selectedOptions{\n            name,\n            value\n          }\n          inventoryItem {\n            countryCodeOfOrigin\n            harmonizedSystemCode\n            measurement {\n              weight {\n                unit\n                value\n              } \n            }\n            provinceCodeOfOrigin\n            sku\n            tracked\n            requiresShipping\n          }\n          inventoryPolicy\n          inventoryQuantity\n          taxCode\n          taxable\n        }\n      }\n    }\n  }\n": {return: VariantCreationInformationQuery, variables: VariantCreationInformationQueryVariables},
  "#graphql \n  query variantDeliveryProfiles($query: String, $first: Int){\n    productVariants(query: $query, first: $first){\n      edges {\n        node {\n          deliveryProfile {\n            id\n          }\n        }\n      }\n    }\n  }\n": {return: VariantDeliveryProfilesQuery, variables: VariantDeliveryProfilesQueryVariables},
}

interface GeneratedMutationTypes {
  "#graphql \n  mutation carrierServiceCreate($input: DeliveryCarrierServiceCreateInput!) {\n    carrierServiceCreate(input: $input) {\n      carrierService {\n        id\n        name\n      }\n      userErrors {\n        field\n        message\n      }\n    }\n  }\n": {return: CarrierServiceCreateMutation, variables: CarrierServiceCreateMutationVariables},
  "#graphql\n  mutation fulfillmentServiceDelete($id: ID!) {\n    fulfillmentServiceDelete(id: $id) {\n      deletedId\n      userErrors {\n        field\n        message\n      }\n    }\n  }\n": {return: FulfillmentServiceDeleteMutation, variables: FulfillmentServiceDeleteMutationVariables},
  "#graphql\n  mutation fulfillmentServiceCreate(\n    $name: String!\n    $callbackUrl: URL!\n    $trackingSupport: Boolean!\n  ) {\n    fulfillmentServiceCreate(\n      name: $name\n      callbackUrl: $callbackUrl\n      trackingSupport: $trackingSupport\n    ) {\n      fulfillmentService {\n        id\n        serviceName\n        callbackUrl\n        location {\n          id\n        }\n        trackingSupport\n      }\n      userErrors {\n        field\n        message\n      }\n    }\n  }\n": {return: FulfillmentServiceCreateMutation, variables: FulfillmentServiceCreateMutationVariables},
  "#graphql \n  mutation StorefrontAccessTokenCreate($input: StorefrontAccessTokenInput!) {\n      storefrontAccessTokenCreate(input: $input) {\n        userErrors {\n          field\n          message\n        }\n        shop {\n          id\n        }\n        storefrontAccessToken {\n          accessScopes {\n            handle\n          }\n          accessToken\n          title\n        }\n      }\n    }\n": {return: StorefrontAccessTokenCreateMutation, variables: StorefrontAccessTokenCreateMutationVariables},
  "#graphql\n  mutation productVariantsBulkCreate($productId: ID!, $variants: [ProductVariantsBulkInput!]!, $strategy: ProductVariantsBulkCreateStrategy) {\n      productVariantsBulkCreate(productId: $productId, variants: $variants, strategy: $strategy) {\n        product {\n          id\n        }\n        productVariants {\n          id\n          inventoryItem {\n            id\n          }\n        }\n        userErrors {\n          field\n          message\n        }\n      }\n    }\n": {return: ProductVariantsBulkCreateMutation, variables: ProductVariantsBulkCreateMutationVariables},
}
declare module '@shopify/admin-api-client' {
  type InputMaybe<T> = AdminTypes.InputMaybe<T>;
  interface AdminQueries extends GeneratedQueryTypes {}
  interface AdminMutations extends GeneratedMutationTypes {}
}
