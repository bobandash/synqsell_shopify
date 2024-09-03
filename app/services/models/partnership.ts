import { errorHandler } from '../util';
import db from '~/db.server';

export async function getAllSupplierPartnerships(retailerId: string) {
  try {
    const supplierPartnerships = await db.partnership.findMany({
      where: {
        retailerId,
      },
      include: {
        priceLists: true,
        retailer: {
          select: {
            userProfile: true,
          },
        },
        supplier: {
          select: {
            userProfile: true,
          },
        },
      },
    });
    return supplierPartnerships;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to get all supplier partnerships.',
      getAllSupplierPartnerships,
      {
        retailerId,
      },
    );
  }
}
