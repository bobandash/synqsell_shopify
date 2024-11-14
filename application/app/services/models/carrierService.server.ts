import db from '~/db.server';

export async function userHasCarrierService(retailerId: string) {
  const carrierService = await db.carrierService.findFirst({
    where: {
      retailerId,
    },
  });
  if (!carrierService) {
    return false;
  }
  return true;
}

export async function createCarrierService(
  retailerId: string,
  shopifyCarrierServiceId: string,
) {
  const newCarrierService = db.carrierService.create({
    data: {
      retailerId,
      shopifyCarrierServiceId,
    },
  });
  return newCarrierService;
}

export async function userGetCarrierService(retailerId: string) {
  const carrierService = await db.carrierService.findFirstOrThrow({
    where: {
      retailerId,
    },
  });
  return carrierService;
}

export async function deleteCarrierService(retailerId: string) {
  const deletedCarrierService = await db.carrierService.delete({
    where: {
      retailerId,
    },
  });
  return deletedCarrierService;
}
