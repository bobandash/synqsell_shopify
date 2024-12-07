import type { GraphQL } from '~/types';
import {
  getOrCreateFulfillmentService as prismaGetOrCreateFulfillmentService,
  userHasFulfillmentService as prismaUserHasFulfillmentService,
} from '../models/fulfillmentService.server';
import {
  getOrCreateFulfillmentService as shopifyGetOrCreateFulfillmentService,
  getFulfillmentService as shopifyGetFulfillmentService,
} from '../shopify/fulfillmentService';

// this is the coordinator for creating a fulfillment service on Shopify and for the prisma db
export async function getOrCreateFulfillmentService(
  sessionId: string,
  graphql: GraphQL,
) {
  const shopifyFulfillmentService =
    await shopifyGetOrCreateFulfillmentService(graphql);
  const prismaFulfillmentService = await prismaGetOrCreateFulfillmentService(
    sessionId,
    shopifyFulfillmentService,
  );
  return prismaFulfillmentService;
}

export async function hasFulfillmentService(
  sessionId: string,
  graphql: GraphQL,
) {
  const fulfillmentServiceId = await shopifyGetFulfillmentService(graphql);
  const hasFulfillmentServiceInDb =
    await prismaUserHasFulfillmentService(sessionId);
  if (!fulfillmentServiceId || !hasFulfillmentServiceInDb) {
    return false;
  }
  return true;
}
