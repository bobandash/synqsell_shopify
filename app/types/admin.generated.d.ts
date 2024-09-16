/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */
import type * as AdminTypes from './admin.types';

export type CarrierServiceCreateMutationVariables = AdminTypes.Exact<{
  input: AdminTypes.DeliveryCarrierServiceCreateInput;
}>;


export type CarrierServiceCreateMutation = { carrierServiceCreate?: AdminTypes.Maybe<{ carrierService?: AdminTypes.Maybe<Pick<AdminTypes.DeliveryCarrierService, 'id' | 'name'>>, userErrors: Array<Pick<AdminTypes.CarrierServiceCreateUserError, 'field' | 'message'>> }> };

export type InitialCarrierServicesQueryVariables = AdminTypes.Exact<{ [key: string]: never; }>;


export type InitialCarrierServicesQuery = { carrierServices: { edges: Array<{ node: Pick<AdminTypes.DeliveryCarrierService, 'id' | 'name'> }>, pageInfo: Pick<AdminTypes.PageInfo, 'hasNextPage' | 'endCursor'> } };

export type SubsequentCarrierServicesQueryVariables = AdminTypes.Exact<{
  after: AdminTypes.Scalars['String']['input'];
}>;


export type SubsequentCarrierServicesQuery = { carrierServices: { edges: Array<{ node: Pick<AdminTypes.DeliveryCarrierService, 'id' | 'name'> }>, pageInfo: Pick<AdminTypes.PageInfo, 'hasNextPage' | 'endCursor'> } };

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

export type ProductBasicInfoQueryVariables = AdminTypes.Exact<{
  query?: AdminTypes.InputMaybe<AdminTypes.Scalars['String']['input']>;
  first?: AdminTypes.InputMaybe<AdminTypes.Scalars['Int']['input']>;
}>;


export type ProductBasicInfoQuery = { products: { edges: Array<{ node: (
        Pick<AdminTypes.Product, 'id' | 'title' | 'onlineStoreUrl'>
        & { media: { edges: Array<{ node: (
              Pick<AdminTypes.ExternalVideo, 'id' | 'alt'>
              & { preview?: AdminTypes.Maybe<{ image?: AdminTypes.Maybe<Pick<AdminTypes.Image, 'url'>> }> }
            ) | (
              Pick<AdminTypes.MediaImage, 'id' | 'alt'>
              & { preview?: AdminTypes.Maybe<{ image?: AdminTypes.Maybe<Pick<AdminTypes.Image, 'url'>> }> }
            ) | (
              Pick<AdminTypes.Model3d, 'id' | 'alt'>
              & { preview?: AdminTypes.Maybe<{ image?: AdminTypes.Maybe<Pick<AdminTypes.Image, 'url'>> }> }
            ) | (
              Pick<AdminTypes.Video, 'id' | 'alt'>
              & { preview?: AdminTypes.Maybe<{ image?: AdminTypes.Maybe<Pick<AdminTypes.Image, 'url'>> }> }
            ) }> }, variantsCount?: AdminTypes.Maybe<Pick<AdminTypes.Count, 'count'>> }
      ) }> } };

export type ActivateInventoryItemMutationVariables = AdminTypes.Exact<{
  inventoryItemId: AdminTypes.Scalars['ID']['input'];
  locationId: AdminTypes.Scalars['ID']['input'];
  available?: AdminTypes.InputMaybe<AdminTypes.Scalars['Int']['input']>;
}>;


export type ActivateInventoryItemMutation = { inventoryActivate?: AdminTypes.Maybe<{ inventoryLevel?: AdminTypes.Maybe<(
      Pick<AdminTypes.InventoryLevel, 'id'>
      & { quantities: Array<Pick<AdminTypes.InventoryQuantity, 'name' | 'quantity'>>, item: Pick<AdminTypes.InventoryItem, 'id'>, location: Pick<AdminTypes.Location, 'id'> }
    )> }> };

export type ProductCreationInformationQueryVariables = AdminTypes.Exact<{
  id: AdminTypes.Scalars['ID']['input'];
}>;


export type ProductCreationInformationQuery = { product?: AdminTypes.Maybe<(
    Pick<AdminTypes.Product, 'id' | 'descriptionHtml' | 'productType' | 'isGiftCard' | 'requiresSellingPlan' | 'status' | 'tags' | 'title'>
    & { category?: AdminTypes.Maybe<Pick<AdminTypes.TaxonomyCategory, 'id'>>, options: Array<(
      Pick<AdminTypes.ProductOption, 'name' | 'position'>
      & { optionValues: Array<Pick<AdminTypes.ProductOptionValue, 'name'>> }
    )>, mediaCount?: AdminTypes.Maybe<Pick<AdminTypes.Count, 'count'>> }
  )> };

export type ProductMediaQueryVariables = AdminTypes.Exact<{
  id: AdminTypes.Scalars['ID']['input'];
  first: AdminTypes.Scalars['Int']['input'];
}>;


export type ProductMediaQuery = { product?: AdminTypes.Maybe<{ media: { edges: Array<{ node: Pick<AdminTypes.ExternalVideo, 'originUrl' | 'alt' | 'mediaContentType'> | (
          Pick<AdminTypes.MediaImage, 'alt' | 'mediaContentType'>
          & { image?: AdminTypes.Maybe<Pick<AdminTypes.Image, 'url'>> }
        ) | (
          Pick<AdminTypes.Model3d, 'alt' | 'mediaContentType'>
          & { sources: Array<Pick<AdminTypes.Model3dSource, 'url'>> }
        ) | (
          Pick<AdminTypes.Video, 'alt' | 'mediaContentType'>
          & { sources: Array<Pick<AdminTypes.VideoSource, 'url'>> }
        ) }> } }> };

export type ProductCreateMutationVariables = AdminTypes.Exact<{
  input: AdminTypes.ProductInput;
  media?: AdminTypes.InputMaybe<Array<AdminTypes.CreateMediaInput> | AdminTypes.CreateMediaInput>;
}>;


export type ProductCreateMutation = { productCreate?: AdminTypes.Maybe<{ product?: AdminTypes.Maybe<Pick<AdminTypes.Product, 'id'>>, userErrors: Array<Pick<AdminTypes.UserError, 'message' | 'field'>> }> };

export type ProductUrlsQueryQueryVariables = AdminTypes.Exact<{
  first?: AdminTypes.InputMaybe<AdminTypes.Scalars['Int']['input']>;
  query?: AdminTypes.InputMaybe<AdminTypes.Scalars['String']['input']>;
}>;


export type ProductUrlsQueryQuery = { products: { edges: Array<{ node: Pick<AdminTypes.Product, 'id' | 'onlineStoreUrl'> }> } };

export type ProfileDefaultsQueryVariables = AdminTypes.Exact<{ [key: string]: never; }>;


export type ProfileDefaultsQuery = { shop: (
    Pick<AdminTypes.Shop, 'name' | 'contactEmail' | 'description' | 'url' | 'currencyCode'>
    & { billingAddress: Pick<AdminTypes.ShopAddress, 'city' | 'provinceCode' | 'country'> }
  ) };

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
  "#graphql\n  query initialCarrierServices {\n    carrierServices(first:5) {\n      edges {\n        node {\n          id\n          name\n        }\n      }\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n    }\n  }\n": {return: InitialCarrierServicesQuery, variables: InitialCarrierServicesQueryVariables},
  "#graphql\n  query subsequentCarrierServices($after: String!) {\n    carrierServices(after: $after, first:5) {\n      edges {\n        node {\n          id\n          name\n        }\n      }\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n    }\n  }\n": {return: SubsequentCarrierServicesQuery, variables: SubsequentCarrierServicesQueryVariables},
  "#graphql\n  query allFulfillmentServices {\n    shop {\n      fulfillmentServices {\n        id\n        serviceName\n        callbackUrl\n        location {\n          id\n        }\n        trackingSupport\n      }\n    }\n  }\n": {return: AllFulfillmentServicesQuery, variables: AllFulfillmentServicesQueryVariables},
  "#graphql \n  query ProductBasicInfo($query: String, $first: Int){\n    products(query: $query, first: $first) {\n      edges {\n        node {\n          id\n          title\n          media(first: 1) {\n            edges {\n              node {\n                id\n                alt\n                preview {\n                  image {\n                    url\n                  }\n                }\n              }\n            }\n          }\n          variantsCount {\n            count\n          }\n          onlineStoreUrl\n        }\n      }\n    }\n  }\n": {return: ProductBasicInfoQuery, variables: ProductBasicInfoQueryVariables},
  "#graphql\n  query ProductCreationInformation($id: ID!) {\n    product(id: $id){\n      id\n      category {\n        id\n      }\n      descriptionHtml\n      productType\n      isGiftCard\n      options {\n        name\n        position\n        optionValues {\n          name\n        }\n      }\n      requiresSellingPlan\n      status\n      tags\n      title\n      mediaCount {\n        count\n      }\n    }\n  }\n": {return: ProductCreationInformationQuery, variables: ProductCreationInformationQueryVariables},
  "#graphql \n  query ProductMedia($id: ID!, $first: Int!) {\n    product(id: $id) {\n      media(first: $first) {\n        edges {\n          node {\n            alt\n            mediaContentType\n            ... on MediaImage {\n              image {\n                url\n              }\n            }\n            ... on Video {\n              sources {\n                url\n              }\n            }\n            ... on ExternalVideo {\n              originUrl\n            }\n            ... on Model3d {\n              sources {\n                url\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n": {return: ProductMediaQuery, variables: ProductMediaQueryVariables},
  "\n        query ProductUrlsQuery($first: Int, $query: String) {\n          products(first: $first, query: $query) {\n            edges {\n              node {\n                id\n                onlineStoreUrl\n              }\n            }\n          }\n        }\n      ": {return: ProductUrlsQueryQuery, variables: ProductUrlsQueryQueryVariables},
  "#graphql \n  query ProfileDefaults {\n    shop {\n      name\n      contactEmail\n      description\n      url\n      currencyCode\n      billingAddress {\n        city\n        provinceCode\n        country\n      }\n    }\n  }\n": {return: ProfileDefaultsQuery, variables: ProfileDefaultsQueryVariables},
  "#graphql \n  query VariantBasicInfo($query: String, $first: Int){\n    productVariants(query: $query, first: $first){\n      edges {\n        node {\n          id\n          title\n          sku\n        }\n      }\n    }\n  }\n": {return: VariantBasicInfoQuery, variables: VariantBasicInfoQueryVariables},
  "#graphql \n  query variantCreationInformation($query: String, $first: Int){\n    productVariants(query: $query, first: $first){\n      edges {\n        node {\n          id\n          barcode\n          compareAtPrice\n          selectedOptions{\n            name,\n            value\n          }\n          inventoryItem {\n            countryCodeOfOrigin\n            harmonizedSystemCode\n            measurement {\n              weight {\n                unit\n                value\n              } \n            }\n            provinceCodeOfOrigin\n            sku\n            tracked\n            requiresShipping\n          }\n          inventoryPolicy\n          inventoryQuantity\n          taxCode\n          taxable\n        }\n      }\n    }\n  }\n": {return: VariantCreationInformationQuery, variables: VariantCreationInformationQueryVariables},
  "#graphql \n  query variantDeliveryProfiles($query: String, $first: Int){\n    productVariants(query: $query, first: $first){\n      edges {\n        node {\n          deliveryProfile {\n            id\n          }\n        }\n      }\n    }\n  }\n": {return: VariantDeliveryProfilesQuery, variables: VariantDeliveryProfilesQueryVariables},
}

interface GeneratedMutationTypes {
  "#graphql \n  mutation carrierServiceCreate($input: DeliveryCarrierServiceCreateInput!) {\n    carrierServiceCreate(input: $input) {\n      carrierService {\n        id\n        name\n      }\n      userErrors {\n        field\n        message\n      }\n    }\n  }\n": {return: CarrierServiceCreateMutation, variables: CarrierServiceCreateMutationVariables},
  "#graphql\n  mutation fulfillmentServiceDelete($id: ID!) {\n    fulfillmentServiceDelete(id: $id) {\n      deletedId\n      userErrors {\n        field\n        message\n      }\n    }\n  }\n": {return: FulfillmentServiceDeleteMutation, variables: FulfillmentServiceDeleteMutationVariables},
  "#graphql\n  mutation fulfillmentServiceCreate(\n    $name: String!\n    $callbackUrl: URL!\n    $trackingSupport: Boolean!\n  ) {\n    fulfillmentServiceCreate(\n      name: $name\n      callbackUrl: $callbackUrl\n      trackingSupport: $trackingSupport\n    ) {\n      fulfillmentService {\n        id\n        serviceName\n        callbackUrl\n        location {\n          id\n        }\n        trackingSupport\n      }\n      userErrors {\n        field\n        message\n      }\n    }\n  }\n": {return: FulfillmentServiceCreateMutation, variables: FulfillmentServiceCreateMutationVariables},
  "#graphql\n  mutation ActivateInventoryItem($inventoryItemId: ID!, $locationId: ID!, $available: Int) {\n    inventoryActivate(inventoryItemId: $inventoryItemId, locationId: $locationId, available: $available) {\n      inventoryLevel {\n        id\n        quantities(names: [\"available\"]) {\n          name\n          quantity\n        }\n        item {\n          id\n        }\n        location {\n          id\n        }\n      }\n    }\n  }\n": {return: ActivateInventoryItemMutation, variables: ActivateInventoryItemMutationVariables},
  "#graphql \n  mutation ProductCreate($input: ProductInput!, $media: [CreateMediaInput!]) {\n    productCreate(input: $input, media: $media) {\n      product {\n        id\n      }\n      userErrors {\n        message\n        field\n      }\n    }\n  }\n": {return: ProductCreateMutation, variables: ProductCreateMutationVariables},
  "#graphql\n  mutation productVariantsBulkCreate($productId: ID!, $variants: [ProductVariantsBulkInput!]!, $strategy: ProductVariantsBulkCreateStrategy) {\n      productVariantsBulkCreate(productId: $productId, variants: $variants, strategy: $strategy) {\n        product {\n          id\n        }\n        productVariants {\n          id\n          inventoryItem {\n            id\n          }\n        }\n        userErrors {\n          field\n          message\n        }\n      }\n    }\n": {return: ProductVariantsBulkCreateMutation, variables: ProductVariantsBulkCreateMutationVariables},
}
declare module '@shopify/admin-api-client' {
  type InputMaybe<T> = AdminTypes.InputMaybe<T>;
  interface AdminQueries extends GeneratedQueryTypes {}
  interface AdminMutations extends GeneratedMutationTypes {}
}
