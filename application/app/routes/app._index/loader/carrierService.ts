import type { GraphQL } from '~/types';
import {
  deleteCarrierService as dbDeleteCarrierService,
  createCarrierService as dbCreateCarrierService,
  userHasCarrierService,
} from '~/services/models/carrierService.server';
import {
  getCarrierService as shopifyGetCarrierService,
  createCarrierService as shopifyCreateCarrierService,
} from '~/services/shopify/carrierService';

export async function getOrCreateCarrierService(
  sessionId: string,
  graphql: GraphQL,
) {
  const [dbCarrierServiceExists, shopifyCarrierService] = await Promise.all([
    userHasCarrierService(sessionId),
    shopifyGetCarrierService(sessionId, graphql),
  ]);

  // if there's data out of sync between Shopify and SynqSell's db for any reason
  // we have to check it like this because a carrier service can only have a single unique name
  if (shopifyCarrierService && !dbCarrierServiceExists) {
    await dbCreateCarrierService(sessionId, shopifyCarrierService.id);
    return shopifyCarrierService;
  } else if (!shopifyCarrierService && dbCarrierServiceExists) {
    await dbDeleteCarrierService(sessionId);
  }

  if (shopifyCarrierService) {
    return shopifyCarrierService;
  }

  const newShopifyCarrierService = await shopifyCreateCarrierService(
    sessionId,
    graphql,
  );
  await dbCreateCarrierService(sessionId, newShopifyCarrierService.id);
  return newShopifyCarrierService;
}
