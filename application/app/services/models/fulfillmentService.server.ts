import type { AllFulfillmentServicesQuery } from '~/types/admin.generated';
import db from '~/db.server';

export type FulfillmentServiceShopifyProps = {
  id: string;
  name: string;
};

export type FulfillmentServiceDBProps = {
  id: string;
  fulfillmentServiceId: string;
  sessionId: string;
};

export async function hasFulfillmentService(id: string) {
  const fulfillmentService = await db.fulfillmentService.findFirst({
    where: {
      id,
    },
  });
  if (!fulfillmentService) {
    return false;
  }
  return true;
}

export async function getFulfillmentService(id: string) {
  const fulfillmentService = await db.fulfillmentService.findFirstOrThrow({
    where: {
      id,
    },
  });
  return fulfillmentService;
}

export async function userHasFulfillmentService(sessionId: string) {
  const fulfillmentService = await db.fulfillmentService.findFirst({
    where: {
      sessionId,
    },
  });
  if (!fulfillmentService) {
    return false;
  }
  return true;
}

export async function userGetFulfillmentService(sessionId: string) {
  const fulfillmentService = await db.fulfillmentService.findFirstOrThrow({
    where: {
      sessionId,
    },
  });
  return fulfillmentService;
}

export async function hasShopifyFulfillmentServiceId(
  shopifyFulfillmentServiceId: string,
) {
  const fulfillmentService = await db.fulfillmentService.findFirst({
    where: {
      shopifyFulfillmentServiceId,
    },
  });
  if (!fulfillmentService) {
    return false;
  }
  return true;
}

// methods for deleting a fulfillment service in prisma
export async function deleteFulfillmentService(id: string) {
  const deletedFulfillmentService = await db.fulfillmentService.delete({
    where: {
      id,
    },
  });
  return deletedFulfillmentService;
}

export async function getOrCreateFulfillmentService(
  sessionId: string,
  shopifyFulfillmentService: AllFulfillmentServicesQuery['shop']['fulfillmentServices'][0],
) {
  const fulfillmentServiceExists = await hasFulfillmentService(sessionId);
  if (fulfillmentServiceExists) {
    const fulfillmentService = await getFulfillmentService(sessionId);
    return fulfillmentService;
  }

  const fulfillmentService = await db.fulfillmentService.create({
    data: {
      sessionId,
      shopifyFulfillmentServiceId: shopifyFulfillmentService.id,
      shopifyLocationId: shopifyFulfillmentService.location?.id ?? '',
    },
  });
  return fulfillmentService;
}
