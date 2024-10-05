import type { GraphQL } from '~/types';
import {
  CREATE_FULFILLMENT_SERVICE,
  DELETE_FULFILLMENT_SERVICE,
  GET_ALL_FULFILLMENT_SERVICES,
} from './graphql';
import { errorHandler } from '~/services/util';
import { FULFILLMENT_SERVICE } from '~/constants';
import getUserError from '../util/getUserError';

export async function getFulfillmentService(
  sessionId: string,
  graphql: GraphQL,
) {
  try {
    const response = await graphql(GET_ALL_FULFILLMENT_SERVICES);
    const { data } = await response.json();
    if (!data) {
      return null;
    }
    const fulfillmentServices = data.shop.fulfillmentServices;
    const fulfillmentServicesFiltered = fulfillmentServices.filter(
      (service) => service.serviceName === FULFILLMENT_SERVICE.name,
    );
    if (fulfillmentServicesFiltered.length === 0) {
      return null;
    }
    return fulfillmentServicesFiltered[0];
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to retrieve fulfillment service from shopify.',
      getFulfillmentService,
      { sessionId },
    );
  }
}

export async function deleteFulfillmentService(id: string, graphql: GraphQL) {
  try {
    const response = await graphql(DELETE_FULFILLMENT_SERVICE, {
      variables: {
        id: id,
      },
    });
    const { data } = await response.json();
    const fulfillmentServiceDelete = data?.fulfillmentServiceDelete;
    if (
      !fulfillmentServiceDelete ||
      !fulfillmentServiceDelete.deletedId ||
      fulfillmentServiceDelete.userErrors.length > 0
    ) {
      throw getUserError({
        defaultMessage:
          'Data is missing from deleting fulfillment service in Shopify.',
        userErrors: fulfillmentServiceDelete?.userErrors,
        parentFunc: deleteFulfillmentService,
        data: { id },
      });
    }

    return fulfillmentServiceDelete.deletedId;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to delete fulfillment service in Shopify.',
      deleteFulfillmentService,
      { id },
    );
  }
}

export async function createFulfillmentService(
  sessionId: string,
  graphql: GraphQL,
) {
  try {
    const response = await graphql(CREATE_FULFILLMENT_SERVICE, {
      variables: {
        name: FULFILLMENT_SERVICE.name,
        callbackUrl: FULFILLMENT_SERVICE.callbackUrl,
        trackingSupport: true,
      },
    });

    const { data } = await response.json();
    const fulfillmentServiceCreate = data?.fulfillmentServiceCreate;

    if (
      !fulfillmentServiceCreate ||
      !fulfillmentServiceCreate.fulfillmentService ||
      fulfillmentServiceCreate.userErrors.length > 0
    ) {
      throw getUserError({
        defaultMessage:
          'Data is missing from creating a fulfillment service in Shopify.',
        userErrors: fulfillmentServiceCreate?.userErrors,
        parentFunc: createFulfillmentService,
        data: { sessionId },
      });
    }

    return fulfillmentServiceCreate.fulfillmentService;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to create fulfillment service on shopify.',
      createFulfillmentService,
      { sessionId },
    );
  }
}

export async function getOrCreateFulfillmentService(
  sessionId: string,
  graphql: GraphQL,
) {
  try {
    let fulfillmentService = await getFulfillmentService(sessionId, graphql);
    if (fulfillmentService) {
      return fulfillmentService;
    }
    fulfillmentService = await createFulfillmentService(sessionId, graphql);
    return fulfillmentService;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to create or retrieve fulfillment service on shopify.',
      getOrCreateFulfillmentService,
      { sessionId },
    );
  }
}
