import { FULFILLMENT_SERVICE } from '~/constants';
import { type GraphQL } from '~/types';
import { errorHandler } from '../util';
import logger from '~/logger';
import createHttpError from 'http-errors';

export async function getFulfillmentServiceId(
  sessionId: string,
  graphql: GraphQL,
) {
  try {
    const response = await graphql(`
      query FulfillmentServicesQuery {
        shop {
          fulfillmentServices {
            id
            serviceName
          }
        }
      }
    `);
    const { data } = await response.json();
    if (!data) {
      return null;
    }

    const fulfillmentServices = data.shop.fulfillmentServices;
    const fulfillmentService = fulfillmentServices.filter(
      (service) => service.serviceName === FULFILLMENT_SERVICE.name,
    )[0];
    if (!fulfillmentService) {
      return null;
    }
    return fulfillmentService.id;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to retrieve fulfillment service from Shopify.',
      getFulfillmentServiceId,
      { sessionId },
    );
  }
}

export async function deleteFulfillmentService(
  id: string,
  sessionId: string,
  graphql: GraphQL,
) {
  try {
    const response = await graphql(
      `
        mutation fulfillmentServiceDelete($id: ID!) {
          fulfillmentServiceDelete(id: $id) {
            deletedId
            userErrors {
              field
              message
            }
          }
        }
      `,
      {
        variables: {
          id: id,
        },
      },
    );
    const { data } = await response.json();
    const fulfillmentServiceDelete = data?.fulfillmentServiceDelete;
    if (!fulfillmentServiceDelete || !fulfillmentServiceDelete.deletedId) {
      const errorMessagesArr = fulfillmentServiceDelete?.userErrors?.map(
        (error) => error.message,
      ) || [`Failed to delete fulfillment service in Shopify.`];
      const errorMessages = errorMessagesArr.join(' ');
      logger.error(errorMessages, { id, sessionId });
      throw new createHttpError.BadRequest(errorMessages);
    }

    return true;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to delete fulfillment service in Shopify.',
      getFulfillmentServiceId,
      { id, sessionId },
    );
  }
}

export async function createFulfillmentService(
  sessionId: string,
  graphql: GraphQL,
) {
  try {
    const response = await graphql(
      `
        mutation fulfillmentServiceCreate(
          $name: String!
          $callbackUrl: URL!
          $trackingSupport: Boolean!
        ) {
          fulfillmentServiceCreate(
            name: $name
            callbackUrl: $callbackUrl
            trackingSupport: $trackingSupport
          ) {
            fulfillmentService {
              id
              serviceName
              callbackUrl
              trackingSupport
            }
            userErrors {
              field
              message
            }
          }
        }
      `,
      {
        variables: {
          name: FULFILLMENT_SERVICE.name,
          callbackUrl: FULFILLMENT_SERVICE.callbackUrl,
          trackingSupport: true,
        },
      },
    );

    const { data } = await response.json();
    const fulfillmentServiceCreate = data?.fulfillmentServiceCreate;

    if (
      !fulfillmentServiceCreate ||
      !fulfillmentServiceCreate.fulfillmentService
    ) {
      const errorMessages = fulfillmentServiceCreate?.userErrors?.map(
        (error) => error.message,
      ) || [`Failed to create fulfillment service on Shopify.`];
      const message = errorMessages.join(' ');
      logger.error(message, { sessionId });
      throw new createHttpError.BadRequest(message);
    }

    const { fulfillmentService } = fulfillmentServiceCreate;

    return fulfillmentService.id;
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
    let fulfillmentServiceId = await getFulfillmentServiceId(
      sessionId,
      graphql,
    );
    if (fulfillmentServiceId) {
      return fulfillmentServiceId;
    }
    fulfillmentServiceId = await createFulfillmentService(sessionId, graphql);
    return fulfillmentServiceId;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to create or retrieve fulfillment service on shopify.',
      getOrCreateFulfillmentService,
      { sessionId },
    );
  }
}
