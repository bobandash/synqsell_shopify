/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */
import type * as AdminTypes from './admin.types';

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

export type Model3dFieldsFragment = (
  Pick<AdminTypes.Model3d, 'mediaContentType' | 'alt'>
  & { originalSource?: AdminTypes.Maybe<Pick<AdminTypes.Model3dSource, 'url'>> }
);

export type VideoFieldsFragment = (
  Pick<AdminTypes.Video, 'mediaContentType' | 'alt'>
  & { originalSource?: AdminTypes.Maybe<Pick<AdminTypes.VideoSource, 'url'>> }
);

export type ImageFieldsFragment = (
  Pick<AdminTypes.Image, 'url'>
  & { alt: AdminTypes.Image['altText'] }
);

export type ProductInformationForPrismaQueryQueryVariables = AdminTypes.Exact<{
  query?: AdminTypes.InputMaybe<AdminTypes.Scalars['String']['input']>;
  first?: AdminTypes.InputMaybe<AdminTypes.Scalars['Int']['input']>;
}>;


export type ProductInformationForPrismaQueryQuery = { products: { edges: Array<{ node: (
        Pick<AdminTypes.Product, 'id' | 'productType' | 'description' | 'descriptionHtml' | 'status' | 'vendor' | 'title'>
        & { category?: AdminTypes.Maybe<Pick<AdminTypes.TaxonomyCategory, 'id'>>, variantsCount?: AdminTypes.Maybe<Pick<AdminTypes.Count, 'count'>>, images: { edges: Array<{ node: (
              Pick<AdminTypes.Image, 'url'>
              & { alt: AdminTypes.Image['altText'] }
            ) }> }, media: { edges: Array<{ node: (
              Pick<AdminTypes.Model3d, 'mediaContentType' | 'alt'>
              & { originalSource?: AdminTypes.Maybe<Pick<AdminTypes.Model3dSource, 'url'>> }
            ) | (
              Pick<AdminTypes.Video, 'mediaContentType' | 'alt'>
              & { originalSource?: AdminTypes.Maybe<Pick<AdminTypes.VideoSource, 'url'>> }
            ) }> } }
      ) }> } };

export type CreateProductMutationMutationVariables = AdminTypes.Exact<{
  input: AdminTypes.ProductInput;
}>;


export type CreateProductMutationMutation = { productCreate?: AdminTypes.Maybe<{ product?: AdminTypes.Maybe<Pick<AdminTypes.Product, 'id'>>, userErrors: Array<Pick<AdminTypes.UserError, 'message' | 'field'>> }> };

export type CreateProductMediaMutationMutationVariables = AdminTypes.Exact<{
  media: Array<AdminTypes.CreateMediaInput> | AdminTypes.CreateMediaInput;
  productId: AdminTypes.Scalars['ID']['input'];
}>;


export type CreateProductMediaMutationMutation = { productCreateMedia?: AdminTypes.Maybe<{ media?: AdminTypes.Maybe<Array<Pick<AdminTypes.ExternalVideo, 'id'> | Pick<AdminTypes.MediaImage, 'id'> | Pick<AdminTypes.Model3d, 'id'> | Pick<AdminTypes.Video, 'id'>>>, mediaUserErrors: Array<Pick<AdminTypes.MediaUserError, 'field' | 'message'>>, product?: AdminTypes.Maybe<Pick<AdminTypes.Product, 'id'>> }> };

export type ProductVariantsBulkCreateMutationVariables = AdminTypes.Exact<{
  productId: AdminTypes.Scalars['ID']['input'];
  variants: Array<AdminTypes.ProductVariantsBulkInput> | AdminTypes.ProductVariantsBulkInput;
  strategy?: AdminTypes.InputMaybe<AdminTypes.ProductVariantsBulkCreateStrategy>;
}>;


export type ProductVariantsBulkCreateMutation = { productVariantsBulkCreate?: AdminTypes.Maybe<{ product?: AdminTypes.Maybe<Pick<AdminTypes.Product, 'id'>>, productVariants?: AdminTypes.Maybe<Array<(
      Pick<AdminTypes.ProductVariant, 'id'>
      & { inventoryItem: Pick<AdminTypes.InventoryItem, 'id'> }
    )>>, userErrors: Array<Pick<AdminTypes.ProductVariantsBulkCreateUserError, 'field' | 'message'>> }> };

export type ActivateInventoryItemMutationVariables = AdminTypes.Exact<{
  inventoryItemId: AdminTypes.Scalars['ID']['input'];
  locationId: AdminTypes.Scalars['ID']['input'];
  available?: AdminTypes.InputMaybe<AdminTypes.Scalars['Int']['input']>;
}>;


export type ActivateInventoryItemMutation = { inventoryActivate?: AdminTypes.Maybe<{ inventoryLevel?: AdminTypes.Maybe<(
      Pick<AdminTypes.InventoryLevel, 'id'>
      & { quantities: Array<Pick<AdminTypes.InventoryQuantity, 'name' | 'quantity'>>, item: Pick<AdminTypes.InventoryItem, 'id'>, location: Pick<AdminTypes.Location, 'id'> }
    )> }> };

export type ProductUrlsQueryQueryVariables = AdminTypes.Exact<{
  first?: AdminTypes.InputMaybe<AdminTypes.Scalars['Int']['input']>;
  query?: AdminTypes.InputMaybe<AdminTypes.Scalars['String']['input']>;
}>;


export type ProductUrlsQueryQuery = { products: { edges: Array<{ node: Pick<AdminTypes.Product, 'id' | 'onlineStoreUrl'> }> } };

export type ProfileQueryQueryVariables = AdminTypes.Exact<{ [key: string]: never; }>;


export type ProfileQueryQuery = { shop: (
    Pick<AdminTypes.Shop, 'name' | 'contactEmail' | 'description' | 'url'>
    & { billingAddress: Pick<AdminTypes.ShopAddress, 'city' | 'provinceCode' | 'country'> }
  ) };

export type VariantInformationForPrismaQueryQueryVariables = AdminTypes.Exact<{
  query?: AdminTypes.InputMaybe<AdminTypes.Scalars['String']['input']>;
  first?: AdminTypes.InputMaybe<AdminTypes.Scalars['Int']['input']>;
}>;


export type VariantInformationForPrismaQueryQuery = { productVariants: { edges: Array<{ node: (
        Pick<AdminTypes.ProductVariant, 'id' | 'barcode' | 'compareAtPrice' | 'inventoryPolicy' | 'inventoryQuantity' | 'price' | 'taxable' | 'taxCode'>
        & { inventoryItem: (
          Pick<AdminTypes.InventoryItem, 'countryCodeOfOrigin' | 'harmonizedSystemCode' | 'provinceCodeOfOrigin' | 'requiresShipping' | 'sku' | 'tracked'>
          & { measurement: { weight?: AdminTypes.Maybe<Pick<AdminTypes.Weight, 'unit' | 'value'>> } }
        ), selectedOptions: Array<Pick<AdminTypes.SelectedOption, 'name' | 'value'>> }
      ) }> } };

interface GeneratedQueryTypes {
  "#graphql\n  query allFulfillmentServices {\n    shop {\n      fulfillmentServices {\n        id\n        serviceName\n        callbackUrl\n        location {\n          id\n        }\n        trackingSupport\n      }\n    }\n  }\n": {return: AllFulfillmentServicesQuery, variables: AllFulfillmentServicesQueryVariables},
  "#graphql\n  #graphql\n  fragment Model3dFields on Model3d {\n    mediaContentType\n    alt\n    originalSource {\n      url\n    }\n  }\n\n  #graphql\n  fragment VideoFields on Video {\n    mediaContentType\n    alt\n    originalSource {\n      url\n    }\n  }\n\n  #graphql\n  fragment ImageFields on Image {\n    url\n    alt: altText\n  }\n\n  query ProductInformationForPrismaQuery($query: String, $first: Int) {\n    products(query: $query, first: $first) {\n      edges {\n        node {\n          id\n          category {\n            id\n          }\n          productType\n          description\n          descriptionHtml\n          status\n          vendor\n          title\n          variantsCount {\n            count\n          }\n          images(first: 10) {\n            edges {\n              node {\n                ...ImageFields\n              }\n            }\n          }\n          media(first: 10) {\n            edges {\n              node {\n                ...Model3dFields\n                ...VideoFields\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n": {return: ProductInformationForPrismaQueryQuery, variables: ProductInformationForPrismaQueryQueryVariables},
  "\n        query ProductUrlsQuery($first: Int, $query: String) {\n          products(first: $first, query: $query) {\n            edges {\n              node {\n                id\n                onlineStoreUrl\n              }\n            }\n          }\n        }\n      ": {return: ProductUrlsQueryQuery, variables: ProductUrlsQueryQueryVariables},
  "\n      query profileQuery {\n        shop {\n          name\n          contactEmail\n          description\n          url\n          billingAddress {\n            city\n            provinceCode\n            country\n          }\n        }\n      }\n    ": {return: ProfileQueryQuery, variables: ProfileQueryQueryVariables},
  "#graphql \n  query VariantInformationForPrismaQuery($query: String, $first: Int){\n    productVariants(query: $query, first: $first){\n      edges {\n        node {\n          id\n          barcode,\n          compareAtPrice\n          inventoryItem {\n            countryCodeOfOrigin\n            harmonizedSystemCode\n            measurement {\n              weight {\n                unit\n                value\n              }\n            }\n            provinceCodeOfOrigin\n            requiresShipping\n            sku\n            tracked\n          }\n          inventoryPolicy\n          inventoryQuantity\n          price\n          taxable\n          taxCode\n          selectedOptions {\n            name\n            value\n          }\n        }\n      }\n    }\n  }\n": {return: VariantInformationForPrismaQueryQuery, variables: VariantInformationForPrismaQueryQueryVariables},
}

interface GeneratedMutationTypes {
  "#graphql\n  mutation fulfillmentServiceDelete($id: ID!) {\n    fulfillmentServiceDelete(id: $id) {\n      deletedId\n      userErrors {\n        field\n        message\n      }\n    }\n  }\n": {return: FulfillmentServiceDeleteMutation, variables: FulfillmentServiceDeleteMutationVariables},
  "#graphql\n  mutation fulfillmentServiceCreate(\n    $name: String!\n    $callbackUrl: URL!\n    $trackingSupport: Boolean!\n  ) {\n    fulfillmentServiceCreate(\n      name: $name\n      callbackUrl: $callbackUrl\n      trackingSupport: $trackingSupport\n    ) {\n      fulfillmentService {\n        id\n        serviceName\n        callbackUrl\n        location {\n          id\n        }\n        trackingSupport\n      }\n      userErrors {\n        field\n        message\n      }\n    }\n  }\n": {return: FulfillmentServiceCreateMutation, variables: FulfillmentServiceCreateMutationVariables},
  "#graphql\n  mutation createProductMutation($input: ProductInput!) {\n    productCreate(input: $input) {\n      product {\n        id\n      }\n      userErrors {\n        message\n        field\n      }\n    }\n  }\n": {return: CreateProductMutationMutation, variables: CreateProductMutationMutationVariables},
  "#graphql\n  mutation createProductMediaMutation($media: [CreateMediaInput!]!, $productId: ID!) {\n    productCreateMedia(media: $media, productId: $productId) {\n      media {\n        id\n      }\n      mediaUserErrors {\n        field\n        message\n      }\n      product {\n        id\n      }\n    }\n  }\n": {return: CreateProductMediaMutationMutation, variables: CreateProductMediaMutationMutationVariables},
  "#graphql\n  mutation productVariantsBulkCreate($productId: ID!, $variants: [ProductVariantsBulkInput!]!, $strategy: ProductVariantsBulkCreateStrategy) {\n      productVariantsBulkCreate(productId: $productId, variants: $variants, strategy: $strategy) {\n        product {\n          id\n        }\n        productVariants {\n          id\n          inventoryItem {\n            id\n          }\n        }\n        userErrors {\n          field\n          message\n        }\n      }\n    }\n": {return: ProductVariantsBulkCreateMutation, variables: ProductVariantsBulkCreateMutationVariables},
  "#graphql\n  mutation ActivateInventoryItem($inventoryItemId: ID!, $locationId: ID!, $available: Int) {\n    inventoryActivate(inventoryItemId: $inventoryItemId, locationId: $locationId, available: $available) {\n      inventoryLevel {\n        id\n        quantities(names: [\"available\"]) {\n          name\n          quantity\n        }\n        item {\n          id\n        }\n        location {\n          id\n        }\n      }\n    }\n  }\n": {return: ActivateInventoryItemMutation, variables: ActivateInventoryItemMutationVariables},
}
declare module '@shopify/admin-api-client' {
  type InputMaybe<T> = AdminTypes.InputMaybe<T>;
  interface AdminQueries extends GeneratedQueryTypes {}
  interface AdminMutations extends GeneratedMutationTypes {}
}
