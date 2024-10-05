import db from '~/db.server';
import { errorHandler } from '../util';

export async function userHasCarrierService(retailerId: string) {
  try {
    const carrierService = await db.carrierService.findFirst({
      where: {
        retailerId,
      },
    });
    if (!carrierService) {
      return false;
    }
    return true;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to check if user has carrier service.',
      userHasCarrierService,
      {
        retailerId,
      },
    );
  }
}

export async function createCarrierService(
  retailerId: string,
  shopifyCarrierServiceId: string,
) {
  try {
    const newCarrierService = db.carrierService.create({
      data: {
        retailerId,
        shopifyCarrierServiceId,
      },
    });
    return newCarrierService;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to create carrier service.',
      createCarrierService,
      {
        retailerId,
        shopifyCarrierServiceId,
      },
    );
  }
}

export async function userGetCarrierService(retailerId: string) {
  try {
    const carrierService = await db.carrierService.findFirstOrThrow({
      where: {
        retailerId,
      },
    });
    return carrierService;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to get carrier service.',
      userGetCarrierService,
      { retailerId },
    );
  }
}
