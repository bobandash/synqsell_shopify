import type { GraphQL } from '~/types';
import {
  createCarrierService as prismaCreateCarrierService,
  userHasCarrierService,
} from '../models/carrierService';
import {
  getCarrierService as shopifyGetCarrierService,
  createCarrierService as shopifyCreateCarrierService,
} from '../shopify/carrierService';
import { errorHandler } from '../util';

export async function getOrCreateCarrierService(
  sessionId: string,
  graphql: GraphQL,
) {
  try {
    const [prismaCarrierServiceExists, shopifyCarrierService] =
      await Promise.all([
        userHasCarrierService(sessionId),
        shopifyGetCarrierService(sessionId, graphql),
      ]);

    if (shopifyCarrierService) {
      if (!prismaCarrierServiceExists) {
        await prismaCreateCarrierService(sessionId, shopifyCarrierService.id);
      }
      return shopifyCarrierService;
    }

    const newShopifyCarrierService = await shopifyCreateCarrierService(
      sessionId,
      graphql,
    );
    await prismaCreateCarrierService(sessionId, newShopifyCarrierService.id);
    return newShopifyCarrierService;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to get or create carrier service.',
      getOrCreateCarrierService,
      {
        sessionId,
      },
    );
  }
}
