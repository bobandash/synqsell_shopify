import type { Prisma } from '@prisma/client';
import db from '~/db.server';
import { ROLES } from '~/constants';
import type { RolesOptions } from '~/constants';

const PARTNERSHIP_INCLUDE = {
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
} as const;

type NewPartnershipData = {
  retailerId: string;
  supplierId: string;
  message: string;
  priceListIds: string[];
};

export async function isPartnered(
  retailerId: string,
  supplierId: string,
  tx: Prisma.TransactionClient = db,
) {
  const count = await tx.partnership.count({
    where: {
      retailerId,
      supplierId,
    },
  });
  return count > 0;
}

export async function hasPartnership(
  id: string,
  tx: Prisma.TransactionClient = db,
) {
  const count = await tx.partnership.count({
    where: {
      id,
    },
  });
  return count > 0;
}

export async function getPartnership(
  retailerId: string,
  supplierId: string,
  tx: Prisma.TransactionClient = db,
) {
  const partnership = await tx.partnership.findFirstOrThrow({
    where: {
      retailerId,
      supplierId,
    },
  });
  return partnership;
}

export async function getAllSupplierPartnerships(
  retailerId: string,
  tx: Prisma.TransactionClient = db,
) {
  return tx.partnership.findMany({
    where: {
      retailerId,
    },
    include: PARTNERSHIP_INCLUDE,
  });
}

export async function getAllPartnerships(
  sessionId: string,
  role: RolesOptions,
  tx: Prisma.TransactionClient = db,
) {
  return tx.partnership.findMany({
    where: {
      ...(role === ROLES.RETAILER ? { retailerId: sessionId } : {}),
      ...(role === ROLES.SUPPLIER ? { supplierId: sessionId } : {}),
    },
    include: PARTNERSHIP_INCLUDE,
  });
}

export async function getPartnershipsByRetailersAndSupplier(
  supplierId: string,
  retailerIds: string[],
  tx: Prisma.TransactionClient = db,
) {
  return tx.partnership.findMany({
    where: {
      retailerId: {
        in: retailerIds,
      },
      supplierId,
    },
    include: PARTNERSHIP_INCLUDE,
  });
}

export async function createPartnerships(
  data: NewPartnershipData[],
  tx: Prisma.TransactionClient,
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

export async function deletePartnerships(
  partnershipIds: string[],
  tx: Prisma.TransactionClient = db,
) {
  await tx.partnership.deleteMany({
    where: {
      id: {
        in: partnershipIds,
      },
    },
  });
}

export async function addPriceListToPartnership(
  partnershipId: string,
  priceListId: string,
  tx: Prisma.TransactionClient,
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
