import type { GraphQL } from '~/types';
import {
  getOrCreateFulfillmentService as prismaGetOrCreateFulfillmentService,
  userHasFulfillmentService as prismaUserHasFulfillmentService,
} from '../models/fulfillmentService';
import {
  getOrCreateFulfillmentService as shopifyGetOrCreateFulfillmentService,
  getFulfillmentService as shopifyGetFulfillmentService,
} from '../shopify/fulfillmentService';
import { errorHandler } from '../util';

// this is the coordinator for creating a fulfillment service on Shopify and for the prisma db
export async function getOrCreateFulfillmentService(
  sessionId: string,
  graphql: GraphQL,
) {
  let shopifyFulfillmentService;
  try {
    shopifyFulfillmentService = await shopifyGetOrCreateFulfillmentService(
      sessionId,
      graphql,
    );
    const prismaFulfillmentService = await prismaGetOrCreateFulfillmentService(
      sessionId,
      shopifyFulfillmentService,
    );
    return prismaFulfillmentService;
  } catch (error) {
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
    const fulfillmentServiceId = await shopifyGetFulfillmentService(
      sessionId,
      graphql,
    );
    const hasFulfillmentServiceInDb =
      await prismaUserHasFulfillmentService(sessionId);
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
