import db from '~/db.server';
import type { Prisma } from '@prisma/client';

export type PartnershipRowData = {
  id: string;
  retailerName: string;
  selected: boolean;
};

type PartnershipRawData = Prisma.PartnershipGetPayload<{
  select: {
    id: true;
    retailer: {
      select: {
        userProfile: true;
      };
    };
  };
}>;

async function getPartnershipsInPriceList(
  supplierId: string,
  priceListId: string,
) {
  const partnerships = await db.partnership.findMany({
    where: {
      supplierId: supplierId,
      priceLists: {
        some: {
          id: priceListId,
        },
      },
    },
    select: {
      id: true,
      retailer: {
        select: {
          userProfile: true,
        },
      },
    },
  });
  return partnerships;
}

async function getAllAvailablePartnershipsNotSelected(
  supplierId: string,
  existingPartnerships: PartnershipRowData[],
) {
  const partnershipIdsToExclude = existingPartnerships.map(({ id }) => id);
  const partnerships = await db.partnership.findMany({
    where: {
      supplierId: supplierId,
      id: {
        notIn: partnershipIdsToExclude,
      },
    },
    select: {
      id: true,
      retailer: {
        select: {
          userProfile: true,
        },
      },
    },
  });
  return partnerships;
}

function formatPartnershipRawData(
  partnershipData: PartnershipRawData[],
  selected: boolean,
) {
  return partnershipData.map((partnership) => {
    return {
      id: partnership.id,
      retailerName: partnership.retailer.userProfile?.name ?? '',
      selected,
    };
  });
}

export async function getPartnershipData(
  sessionId: string,
  priceListId?: string,
) {
  let selectedPartnershipsDataFmt: PartnershipRowData[] = [];
  if (priceListId) {
    const partnershipsInPriceList = await getPartnershipsInPriceList(
      sessionId,
      priceListId,
    );
    selectedPartnershipsDataFmt = formatPartnershipRawData(
      partnershipsInPriceList,
      true,
    );
  }
  const notSelectedPartnershipsData =
    await getAllAvailablePartnershipsNotSelected(
      sessionId,
      selectedPartnershipsDataFmt,
    );
  const notSelectedPartnershipsDataFmt = formatPartnershipRawData(
    notSelectedPartnershipsData,
    false,
  );
  const allPartnershipsDataFmt = selectedPartnershipsDataFmt
    .concat(notSelectedPartnershipsDataFmt)
    .sort((a, b) => {
      if (a.retailerName < b.retailerName) {
        return -1;
      }
      if (a.retailerName > b.retailerName) {
        return 1;
      }
      return 0;
    });

  return allPartnershipsDataFmt;
}
