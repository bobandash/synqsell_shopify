import type { AllFulfillmentServicesQuery } from '~/types/admin.generated';
import db from '~/db.server';
import type { Prisma } from '@prisma/client';

export type FulfillmentServiceShopifyProps = {
  id: string;
  name: string;
};

export type FulfillmentServiceDBProps = {
  id: string;
  fulfillmentServiceId: string;
  sessionId: string;
};

export async function hasFulfillmentService(
  id: string,
  tx: Prisma.TransactionClient = db,
) {
  const count = await tx.fulfillmentService.count({
    where: { id },
  });
  return count > 0;
}

export async function getFulfillmentService(
  id: string,
  tx: Prisma.TransactionClient = db,
) {
  return tx.fulfillmentService.findFirstOrThrow({
    where: { id },
  });
}

export async function userHasFulfillmentService(
  sessionId: string,
  tx: Prisma.TransactionClient = db,
) {
  const count = await tx.fulfillmentService.count({
    where: { sessionId },
  });
  return count > 0;
}

export async function userGetFulfillmentService(
  sessionId: string,
  tx: Prisma.TransactionClient = db,
) {
  return tx.fulfillmentService.findFirstOrThrow({
    where: { sessionId },
  });
}

export async function deleteFulfillmentService(
  id: string,
  tx: Prisma.TransactionClient = db,
) {
  return tx.fulfillmentService.delete({
    where: { id },
  });
}

export async function getOrCreateFulfillmentService(
  sessionId: string,
  shopifyFulfillmentService: AllFulfillmentServicesQuery['shop']['fulfillmentServices'][0],
  tx: Prisma.TransactionClient = db,
) {
  const fulfillmentServiceExists = await userHasFulfillmentService(
    sessionId,
    tx,
  );

  if (fulfillmentServiceExists) {
    return userGetFulfillmentService(sessionId, tx);
  }

  return tx.fulfillmentService.create({
    data: {
      sessionId,
      shopifyFulfillmentServiceId: shopifyFulfillmentService.id,
      shopifyLocationId: shopifyFulfillmentService.location?.id ?? '',
    },
  });
}
