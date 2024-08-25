import type { GraphQL } from '~/types';
import {
  getOrCreateFulfillmentService as prismaGetOrCreateFulfillmentService,
  hasFulfillmentService as prismaHasFulfillmentService,
} from '../models/fulfillmentService';
import {
  getOrCreateFulfillmentService as shopifyGetOrCreateFulfillmentService,
  deleteFulfillmentService as shopifyDeleteFulfillmentService,
  getFulfillmentServiceId as shopifyGetFulfillmentServiceId,
} from '../shopify/fulfillmentService';
import logger from '~/logger';
import { errorHandler } from '../util';

// this is the coordinator for creating a fulfillment service on Shopify and for the prisma db
// TODO: research a bit more about sys design and designing distributed applications, this does not handle all the edge cases
export async function getOrCreateFulfillmentService(
  sessionId: string,
  graphql: GraphQL,
) {
  let shopifyFulfillmentServiceId;
  try {
    shopifyFulfillmentServiceId = await shopifyGetOrCreateFulfillmentService(
      sessionId,
      graphql,
    );
    const prismaFulfillmentService = await prismaGetOrCreateFulfillmentService(
      sessionId,
      shopifyFulfillmentServiceId,
    );
    return prismaFulfillmentService;
  } catch (error) {
    // case: action failed at creating fulfillment service in db
    // TODO: add retry logic in future
    if (shopifyFulfillmentServiceId) {
      try {
        await shopifyDeleteFulfillmentService(
          shopifyFulfillmentServiceId,
          sessionId,
          graphql,
        );
      } catch (error) {
        logger.error(
          'Failed to delete fulfillment service in shopify during rollback',
          { sessionId },
        );
        throw errorHandler(
          error,
          'Failed to delete fulfillment service during rollback. Please contact support.',
          getOrCreateFulfillmentService,
          { sessionId },
        );
      }
    }
    throw errorHandler(
      error,
      'Failed to create fulfillment service',
      getOrCreateFulfillmentService,
      { sessionId },
    );
  }
}

export async function hasFulfillmentService(
  sessionId: string,
  graphql: GraphQL,
) {
  try {
    const fulfillmentServiceId = await shopifyGetFulfillmentServiceId(
      sessionId,
      graphql,
    );
    const hasFulfillmentServiceInDb =
      await prismaHasFulfillmentService(sessionId);
    if (!fulfillmentServiceId || !hasFulfillmentServiceInDb) {
      return false;
    }
    return true;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to check whether fulfillment service exists in both Shopify and Database.',
      hasFulfillmentService,
      { sessionId },
    );
  }
}
