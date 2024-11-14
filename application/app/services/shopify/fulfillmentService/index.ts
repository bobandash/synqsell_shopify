import type { GraphQL } from '~/types';
import {
  CREATE_FULFILLMENT_SERVICE,
  DELETE_FULFILLMENT_SERVICE,
  GET_ALL_FULFILLMENT_SERVICES,
} from './graphql';
import { FULFILLMENT_SERVICE } from '~/constants';
import {
  mutateInternalStoreAdminAPI,
  queryInternalStoreAdminAPI,
} from '../utils';
import type {
  AllFulfillmentServicesQuery,
  FulfillmentServiceCreateMutation,
  FulfillmentServiceDeleteMutation,
} from '~/types/admin.generated';

export async function getFulfillmentService(graphql: GraphQL) {
  const data = await queryInternalStoreAdminAPI<AllFulfillmentServicesQuery>(
    graphql,
    GET_ALL_FULFILLMENT_SERVICES,
    {},
  );
  const fulfillmentServices = data.shop.fulfillmentServices;
  const applicationFulfillmentService = fulfillmentServices.filter(
    (service) => service.serviceName === FULFILLMENT_SERVICE.name,
  );
  if (applicationFulfillmentService.length === 0) {
    return null;
  }
  return applicationFulfillmentService[0];
}

export async function deleteFulfillmentService(id: string, graphql: GraphQL) {
  const data =
    await mutateInternalStoreAdminAPI<FulfillmentServiceDeleteMutation>(
      graphql,
      DELETE_FULFILLMENT_SERVICE,
      { id },
      'Failed to delete fulfillment service in Shopify.',
    );
  return data.fulfillmentServiceDelete?.deletedId ?? '';
}

export async function createFulfillmentService(graphql: GraphQL) {
  const data =
    await mutateInternalStoreAdminAPI<FulfillmentServiceCreateMutation>(
      graphql,
      CREATE_FULFILLMENT_SERVICE,
      {
        name: FULFILLMENT_SERVICE.name,
        callbackUrl: FULFILLMENT_SERVICE.callbackUrl,
        trackingSupport: true,
      },
      'Failed to create fulfillment service in Shopify.',
    );

  const fulfillmentService = data.fulfillmentServiceCreate?.fulfillmentService;
  if (!fulfillmentService) {
    throw new Error('Failed to create fulfillment service on Shopify.');
  }
  return fulfillmentService;
}

export async function getOrCreateFulfillmentService(
  sessionId: string,
  graphql: GraphQL,
) {
  let fulfillmentService = await getFulfillmentService(graphql);
  if (fulfillmentService) {
    return fulfillmentService;
  }
  fulfillmentService = await createFulfillmentService(graphql);
  return fulfillmentService;
}
