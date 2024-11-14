import type { Prisma } from '@prisma/client';
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
  const partnershipRequest = await db.partnership.findFirst({
    where: {
      id,
    },
  });

  if (partnershipRequest) {
    return true;
  }
  return false;
}

export async function isSupplierRetailerPartnered(
  retailerId: string,
  supplierId: string,
) {
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
}

export async function getSupplierRetailerPartnership(
  retailerId: string,
  supplierId: string,
) {
  const partnership = await db.partnership.findFirstOrThrow({
    where: {
      retailerId,
      supplierId,
    },
  });
  return partnership;
}

export async function getAllSupplierPartnerships(retailerId: string) {
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
}

export async function getAllPartnerships(
  sessionId: string,
  role: RolesOptions,
) {
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
}

export async function getPartnershipsByRetailersAndSupplier(
  supplierId: string,
  retailerIds: string[],
) {
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
}

export async function createPartnershipsTx(
  tx: Prisma.TransactionClient,
  data: NewPartnershipData[],
) {
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
}

export async function isRetailerInPartnershipPriceList(
  retailerId: string,
  priceListId: string,
) {
  // checks whether retailer is partnered given the price list id

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
}

export async function isRetailerInPartnershipMultiplePriceLists(
  retailerId: string,
  priceListIds: string[],
) {
  // checks whether retailer is partnered given multiple price list ids
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
}

export async function deletePartnershipsTx(
  tx: Prisma.TransactionClient,
  partnershipIds: string[],
) {
  const deletedPartnerships = await tx.partnership.deleteMany({
    where: {
      id: {
        in: partnershipIds,
      },
    },
  });
  return deletedPartnerships;
}

export async function addPriceListToPartnershipTx(
  tx: Prisma.TransactionClient,
  partnershipId: string,
  priceListId: string,
) {
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
}
