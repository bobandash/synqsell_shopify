import type { AllFulfillmentServicesQuery } from '~/types/admin.generated';
import db from '../../db.server';
import { errorHandler } from '../util';

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
  try {
    const fulfillmentService = await db.fulfillmentService.findFirst({
      where: {
        id,
      },
    });
    if (!fulfillmentService) {
      return false;
    }
    return true;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to check if fulfillment service exists.',
      hasFulfillmentService,
      { id },
    );
  }
}

export async function getFulfillmentService(id: string) {
  try {
    const fulfillmentService = await db.fulfillmentService.findFirstOrThrow({
      where: {
        id,
      },
    });
    return fulfillmentService;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to get fulfillment service.',
      getFulfillmentService,
      { id },
    );
  }
}

export async function userHasFulfillmentService(sessionId: string) {
  try {
    const fulfillmentService = await db.fulfillmentService.findFirst({
      where: {
        sessionId,
      },
    });
    if (!fulfillmentService) {
      return false;
    }
    return true;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to check if fulfillment service exists.',
      userHasFulfillmentService,
      { sessionId },
    );
  }
}

export async function userGetFulfillmentService(sessionId: string) {
  try {
    const fulfillmentService = await db.fulfillmentService.findFirstOrThrow({
      where: {
        sessionId,
      },
    });
    return fulfillmentService;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to get fulfillment service.',
      userGetFulfillmentService,
      { sessionId },
    );
  }
}

export async function hasShopifyFulfillmentServiceId(
  shopifyFulfillmentServiceId: string,
) {
  try {
    const fulfillmentService = await db.fulfillmentService.findFirst({
      where: {
        shopifyFulfillmentServiceId,
      },
    });
    if (!fulfillmentService) {
      return false;
    }
    return true;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to check if fulfillment service exists.',
      hasShopifyFulfillmentServiceId,
      { shopifyFulfillmentServiceId },
    );
  }
}

// methods for deleting a fulfillment service in prisma
export async function deleteFulfillmentService(id: string) {
  try {
    const deletedFulfillmentService = await db.fulfillmentService.delete({
      where: {
        id,
      },
    });
    return deletedFulfillmentService;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to delete fulfillment service.',
      deleteFulfillmentService,
      { id },
    );
  }
}

export async function getOrCreateFulfillmentService(
  sessionId: string,
  shopifyFulfillmentService: AllFulfillmentServicesQuery['shop']['fulfillmentServices'][0],
) {
  try {
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
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to retrieve or create fulfillment service.',
      getOrCreateFulfillmentService,
      { sessionId, shopifyFulfillmentService },
    );
  }
}
