import type { Prisma } from '@prisma/client';
import { errorHandler } from '~/lib/utils/server';
import db from '~/db.server';
import { ROLES } from '~/constants';
import type { RolesOptions } from '~/constants';

type NewPartnershipData = {
  retailerId: string;
  supplierId: string;
  message: string;
  priceListIds: string[];
};

export async function hasPartnership(id: string) {
  try {
    const partnershipRequest = await db.partnership.findFirst({
      where: {
        id,
      },
    });

    if (partnershipRequest) {
      return true;
    }
    return false;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to check if partnership id is valid.',
      hasPartnership,
      { id },
    );
  }
}

export async function isSupplierRetailerPartnered(
  retailerId: string,
  supplierId: string,
) {
  try {
    const partnership = await db.partnership.findFirst({
      where: {
        retailerId,
        supplierId,
      },
    });

    if (partnership) {
      return true;
    }
    return false;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to check if retailer and supplier have a partnership.',
      isSupplierRetailerPartnered,
      { retailerId, supplierId },
    );
  }
}

export async function getSupplierRetailerPartnership(
  retailerId: string,
  supplierId: string,
) {
  try {
    const partnership = await db.partnership.findFirstOrThrow({
      where: {
        retailerId,
        supplierId,
      },
    });
    return partnership;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to check if retailer and supplier have a partnership.',
      isSupplierRetailerPartnered,
      { retailerId, supplierId },
    );
  }
}

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

export async function getAllPartnerships(
  sessionId: string,
  role: RolesOptions,
) {
  try {
    const supplierPartnerships = await db.partnership.findMany({
      where: {
        ...(role === ROLES.RETAILER ? { retailerId: sessionId } : {}),
        ...(role === ROLES.SUPPLIER ? { supplierId: sessionId } : {}),
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
      'Failed to get all partnerships given role.',
      getAllPartnerships,
      {
        sessionId,
        role,
      },
    );
  }
}

export async function getPartnershipsByRetailersAndSupplier(
  supplierId: string,
  retailerIds: string[],
) {
  try {
    const supplierPartnerships = await db.partnership.findMany({
      where: {
        retailerId: {
          in: retailerIds,
        },
        supplierId,
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
      'Failed to get partnerships by retailer IDs for a supplier.',
      getPartnershipsByRetailersAndSupplier,
      {
        supplierId,
        retailerIds,
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
            return { id: id };
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

export async function isRetailerInPartnershipPriceList(
  retailerId: string,
  priceListId: string,
) {
  // checks whether retailer is partnered given the price list id
  try {
    const retailer = await db.partnership.findFirst({
      where: {
        retailerId,
        priceLists: {
          some: {
            id: priceListId,
          },
        },
      },
    });
    if (!retailer) {
      return false;
    }
    return true;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to see if retailer has a partnership with the price list.',
      isRetailerInPartnershipPriceList,
      { retailerId, priceListId },
    );
  }
}

export async function isRetailerInPartnershipMultiplePriceLists(
  retailerId: string,
  priceListIds: string[],
) {
  // checks whether retailer is partnered given multiple price list ids
  try {
    const retailer = await db.partnership.findFirst({
      where: {
        retailerId,
        priceLists: {
          some: {
            id: { in: priceListIds },
          },
        },
      },
    });
    if (!retailer) {
      return false;
    }
    return true;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to see if retailer has a partnership with the price list ids.',
      isRetailerInPartnershipPriceList,
      { retailerId, priceListIds },
    );
  }
}

export async function deletePartnershipsTx(
  tx: Prisma.TransactionClient,
  partnershipIds: string[],
) {
  try {
    const deletedPartnerships = await tx.partnership.deleteMany({
      where: {
        id: {
          in: partnershipIds,
        },
      },
    });
    return deletedPartnerships;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to delete partnerships in bulk.',
      deletePartnershipsTx,
      { partnershipIds },
    );
  }
}

export async function addPriceListToPartnershipTx(
  tx: Prisma.TransactionClient,
  partnershipId: string,
  priceListId: string,
) {
  try {
    const partnership = await tx.partnership.update({
      where: {
        id: partnershipId,
      },
      data: {
        priceLists: {
          connect: { id: priceListId },
        },
      },
    });
    return partnership;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to add price list to partnership.',
      addPriceListToPartnershipTx,
      { partnershipId, priceListId },
    );
  }
}
