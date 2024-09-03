import type { Prisma } from '@prisma/client';
import { errorHandler } from '../util';
import db from '~/db.server';

type NewPartnershipData = {
  retailerId: string;
  supplierId: string;
  message: string;
  priceListIds: string[];
};

// TODO: add validations
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

export async function createPartnershipsTx(
  tx: Prisma.TransactionClient,
  data: NewPartnershipData[],
) {
  try {
    const dataInPrismaFmt = data.map(({ priceListIds, ...rest }) => {
      return {
        ...rest,
        priceLists: {
          connect: priceListIds.map((id) => {
            return { id };
          }),
        },
      };
    });
    const newPartnerships = await Promise.all(
      dataInPrismaFmt.map((data) =>
        tx.partnership.create({
          data,
        }),
      ),
    );

    return newPartnerships;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to create new partnerships in transaction.',
      createPartnershipsTx,
      {
        data,
      },
    );
  }
}
