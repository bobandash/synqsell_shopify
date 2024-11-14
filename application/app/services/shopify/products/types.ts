// !!! TODO: Shopify updated their method of product query and mutation for their latest API version 10-10.
// Because of this, using graphql-codegen does not work for exporting product query and mutations.
// As a result, until I update this application to API version 10-10 or until Shopify fixes this issue,
// I have to put the product query and mutations inline instead of using const or manually create the types.

/* eslint-disable */
import type * as AdminTypes from '../../../types/admin.types';

export type ProductBasicInfoQueryVariables = AdminTypes.Exact<{
  query?: AdminTypes.InputMaybe<AdminTypes.Scalars['String']['input']>;
  first?: AdminTypes.InputMaybe<AdminTypes.Scalars['Int']['input']>;
}>;

export type ProductBasicInfoQuery = {
  products: {
    edges: Array<{
      node: Pick<AdminTypes.Product, 'id' | 'title' | 'onlineStoreUrl'> & {
        media: {
          edges: Array<{
            node:
              | (Pick<AdminTypes.ExternalVideo, 'id' | 'alt'> & {
                  preview?: AdminTypes.Maybe<{
                    image?: AdminTypes.Maybe<Pick<AdminTypes.Image, 'url'>>;
                  }>;
                })
              | (Pick<AdminTypes.MediaImage, 'id' | 'alt'> & {
                  preview?: AdminTypes.Maybe<{
                    image?: AdminTypes.Maybe<Pick<AdminTypes.Image, 'url'>>;
                  }>;
                })
              | (Pick<AdminTypes.Model3d, 'id' | 'alt'> & {
                  preview?: AdminTypes.Maybe<{
                    image?: AdminTypes.Maybe<Pick<AdminTypes.Image, 'url'>>;
                  }>;
                })
              | (Pick<AdminTypes.Video, 'id' | 'alt'> & {
                  preview?: AdminTypes.Maybe<{
                    image?: AdminTypes.Maybe<Pick<AdminTypes.Image, 'url'>>;
                  }>;
                });
          }>;
        };
        variantsCount?: AdminTypes.Maybe<Pick<AdminTypes.Count, 'count'>>;
      };
    }>;
  };
};

export type ActivateInventoryItemMutationVariables = AdminTypes.Exact<{
  inventoryItemId: AdminTypes.Scalars['ID']['input'];
  locationId: AdminTypes.Scalars['ID']['input'];
  available?: AdminTypes.InputMaybe<AdminTypes.Scalars['Int']['input']>;
}>;

export type ActivateInventoryItemMutation = {
  inventoryActivate?: AdminTypes.Maybe<{
    inventoryLevel?: AdminTypes.Maybe<
      Pick<AdminTypes.InventoryLevel, 'id'> & {
        quantities: Array<
          Pick<AdminTypes.InventoryQuantity, 'name' | 'quantity'>
        >;
        item: Pick<AdminTypes.InventoryItem, 'id'>;
        location: Pick<AdminTypes.Location, 'id'>;
      }
    >;
  }>;
};

export type ProductCreationInformationQueryVariables = AdminTypes.Exact<{
  id: AdminTypes.Scalars['ID']['input'];
}>;

export type ProductCreationInformationQuery = {
  product?: AdminTypes.Maybe<
    Pick<
      AdminTypes.Product,
      | 'id'
      | 'descriptionHtml'
      | 'productType'
      | 'isGiftCard'
      | 'requiresSellingPlan'
      | 'status'
      | 'tags'
      | 'title'
    > & {
      category?: AdminTypes.Maybe<Pick<AdminTypes.TaxonomyCategory, 'id'>>;
      options: Array<
        Pick<AdminTypes.ProductOption, 'name' | 'position'> & {
          optionValues: Array<Pick<AdminTypes.ProductOptionValue, 'name'>>;
        }
      >;
      mediaCount?: AdminTypes.Maybe<Pick<AdminTypes.Count, 'count'>>;
    }
  >;
};

export type ProductMediaQueryVariables = AdminTypes.Exact<{
  id: AdminTypes.Scalars['ID']['input'];
  first: AdminTypes.Scalars['Int']['input'];
}>;

export type ProductMediaQuery = {
  product?: AdminTypes.Maybe<{
    media: {
      edges: Array<{
        node:
          | Pick<
              AdminTypes.ExternalVideo,
              'originUrl' | 'alt' | 'mediaContentType'
            >
          | (Pick<AdminTypes.MediaImage, 'alt' | 'mediaContentType'> & {
              image?: AdminTypes.Maybe<Pick<AdminTypes.Image, 'url'>>;
            })
          | (Pick<AdminTypes.Model3d, 'alt' | 'mediaContentType'> & {
              sources: Array<Pick<AdminTypes.Model3dSource, 'url'>>;
            })
          | (Pick<AdminTypes.Video, 'alt' | 'mediaContentType'> & {
              sources: Array<Pick<AdminTypes.VideoSource, 'url'>>;
            });
      }>;
    };
  }>;
};

export type ProductCreateMutationVariables = AdminTypes.Exact<{
  input: AdminTypes.ProductInput;
  media?: AdminTypes.InputMaybe<
    Array<AdminTypes.CreateMediaInput> | AdminTypes.CreateMediaInput
  >;
}>;

export type ProductCreateMutation = {
  productCreate?: AdminTypes.Maybe<{
    product?: AdminTypes.Maybe<Pick<AdminTypes.Product, 'id'>>;
    userErrors: Array<Pick<AdminTypes.UserError, 'message' | 'field'>>;
  }>;
};

export type ProductUrlQueryVariables = AdminTypes.Exact<{
  first?: AdminTypes.InputMaybe<AdminTypes.Scalars['Int']['input']>;
  query?: AdminTypes.InputMaybe<AdminTypes.Scalars['String']['input']>;
}>;

export type ProductUrlQuery = {
  products: {
    edges: Array<{ node: Pick<AdminTypes.Product, 'id' | 'onlineStoreUrl'> }>;
  };
};

export type ProductStatusQuery = {
  product?: AdminTypes.Maybe<Pick<AdminTypes.Product, 'id' | 'status'>>;
};
