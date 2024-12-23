import db from '~/db.server';
import {
  PARTNERSHIP_REQUEST_STATUS,
  PARTNERSHIP_REQUEST_TYPE,
  ROLES,
} from '~/constants';
import { boolean, object, string } from 'yup';
import type { Prisma } from '@prisma/client';
import createHttpError from 'http-errors';
import {
  getPartnershipRequestMultiplePriceLists,
  hasPartnershipRequestMultiplePriceLists,
} from '~/services/models/partnershipRequest.server';
import { getAllPriceLists } from '~/services/models/priceList.server';
import { PARTNERSHIP_STATUS, type PartnershipStatusProps } from '../constants';
import { isSupplierRetailerPartnered } from '~/services/models/partnership.server';
import { sessionIdSchema } from '~/schemas/models';

export type RetailerPaginatedInfoProps = {
  retailerPaginatedInfo: {
    nextCursor: string | null;
    prevCursor: string | null;
    retailers: Retailer[];
  };
  priceLists: PriceListJsonify[];
};

export type Retailer = {
  id: string;
  partnershipStatus: PartnershipStatusProps;
  profile: Profile;
};

export type PriceListJsonify = Omit<PriceList, 'createdAt'> & {
  createdAt: string;
};

type Profile = {
  id: string;
  name: string;
  website: string;
  address: string | null;
  email: string;
  logo: string | null;
  biography: string | null;
  desiredProducts: string | null;
  sessionId: string;
  socialMediaLink: SocialMediaLink;
};

type SocialMediaLink = {
  id: string;
  facebook: string;
  twitter: string;
  instagram: string;
  youtube: string;
  tiktok: string;
  userProfileId: string;
};

type PriceList = Prisma.PriceListGetPayload<{}>;

type RetailerPaginatedInfoPrisma = Prisma.SessionGetPayload<{
  select: {
    id: true;
    userProfile: {
      include: {
        socialMediaLink: true;
      };
    };
  };
}>;

type GetRetailerPaginatedInfoProps = {
  isReverseDirection: boolean;
  sessionId: string;
  cursor: string | null;
};

type GetPrismaUnformattedRetailerInfo = GetRetailerPaginatedInfoProps & {
  take: number;
};

const getRetailerPaginatedInfoSchema = object({
  isReverseDirection: boolean().required(),
  cursor: string().nullable(),
  sessionId: sessionIdSchema,
}).test(
  'is-reverse-direction-not-true',
  'Cannot fetch information from reverse direction if cursor is not provided',
  (values) => {
    const { isReverseDirection, cursor } = values;
    if (!cursor && isReverseDirection) {
      return false;
    }
    return true;
  },
);

async function getPrismaUnformattedRetailerInfo({
  isReverseDirection,
  sessionId,
  take,
  cursor,
}: GetPrismaUnformattedRetailerInfo) {
  // the only suppliers that should show up are suppliers with a general price list and at least one product in the price list
  // NOTE: this takes one more than usual in order to check if has more
  const data = await db.session.findMany({
    take: isReverseDirection ? -1 * take : take + 1,
    ...(cursor && { cursor: { id: cursor } }),
    ...(cursor && { skip: 1 }),
    where: {
      id: {
        not: sessionId,
      },
      isAppUninstalled: {
        not: true,
      },
      stripeCustomerAccount: {
        hasPaymentMethod: true,
      },
      roles: {
        some: {
          name: ROLES.RETAILER,
          isVisibleInNetwork: true,
        },
      },
      userProfile: {
        NOT: undefined,
        socialMediaLink: {
          NOT: undefined,
        },
      },
    },
    orderBy: {
      userProfile: {
        name: 'asc',
      },
    },
    select: {
      id: true,
      userProfile: {
        include: {
          socialMediaLink: true,
        },
      },
    },
  });
  const hasMore = data.length > take || isReverseDirection;
  if (isReverseDirection || !hasMore) {
    return { data, hasMore };
  }
  const dataWithoutExtraTake = hasMore ? data.slice(0, -1) : data;
  return { data: dataWithoutExtraTake, hasMore };
}

// retrieves whether the supplier is partnered, sent a request to partner, or never initiated a partnership
async function getPartnershipStatus(
  supplierId: string,
  retailerId: string,
  priceListIds: string[],
): Promise<PartnershipStatusProps> {
  const isPartnered = await isSupplierRetailerPartnered(retailerId, supplierId);
  if (isPartnered) {
    return PARTNERSHIP_STATUS.PARTNERED;
  }
  const partnershipRequestExists =
    await hasPartnershipRequestMultiplePriceLists(
      priceListIds,
      supplierId,
      PARTNERSHIP_REQUEST_TYPE.SUPPLIER,
    );

  if (partnershipRequestExists) {
    const partnershipRequest = await getPartnershipRequestMultiplePriceLists(
      priceListIds,
      supplierId,
      PARTNERSHIP_REQUEST_TYPE.SUPPLIER,
    );
    if (partnershipRequest.status === PARTNERSHIP_REQUEST_STATUS.PENDING) {
      return PARTNERSHIP_STATUS.REQUESTED_PARTNERSHIP;
    }
  }
  return PARTNERSHIP_STATUS.NO_PARTNERSHIP;
}

async function cleanUpRetailerPrismaData(
  retailerRawData: RetailerPaginatedInfoPrisma[],
  sessionId: string,
) {
  // cleans up retailer data and adds approval status to the prisma data
  const priceLists = await getAllPriceLists(sessionId);
  const priceListIds = priceLists.map((priceList) => priceList.id);
  const retailers = await Promise.all(
    retailerRawData.map(async (retailer) => {
      const { userProfile } = retailer;
      if (!userProfile) {
        throw new createHttpError.InternalServerError(
          `A retailer's profile does not exist.`,
        );
      }
      const { socialMediaLink, ...profileRest } = userProfile;
      if (!socialMediaLink) {
        throw new createHttpError.InternalServerError(
          `A retailer's socials do not exist.`,
        );
      }
      const partnershipStatus = await getPartnershipStatus(
        sessionId,
        retailer.id,
        priceListIds,
      );

      return {
        id: retailer.id,
        partnershipStatus,
        profile: {
          ...profileRest,
          socialMediaLink: { ...socialMediaLink },
        },
      };
    }),
  );
  return retailers;
}

// TODO: implement stripe webhook and change
export async function getRetailerPaginatedInfo({
  isReverseDirection,
  sessionId,
  cursor,
}: GetRetailerPaginatedInfoProps) {
  await getRetailerPaginatedInfoSchema.validate({
    isReverseDirection,
    cursor,
    sessionId,
  });

  const take = 8;
  const [firstRetailer, { data: retailerRawData, hasMore }] = await Promise.all(
    [
      getPrismaUnformattedRetailerInfo({
        isReverseDirection: false,
        sessionId,
        take: 1,
        cursor: null,
      }),
      getPrismaUnformattedRetailerInfo({
        isReverseDirection,
        sessionId,
        take,
        cursor,
      }),
    ],
  );

  const firstRetailerId =
    firstRetailer.data.length > 0 ? firstRetailer.data[0].id : null;
  const retailers = await cleanUpRetailerPrismaData(retailerRawData, sessionId);
  // case: there is no data in the network
  if (retailers.length === 0) {
    return {
      nextCursor: null,
      prevCursor: null,
      retailers: [],
    };
  }

  const isFirstPage =
    retailers[0] && retailers[0].id === firstRetailerId ? true : false;
  const prevCursor = isFirstPage ? null : retailers[0].id;
  const nextCursor = hasMore ? retailers[take - 1].id : null;
  return {
    nextCursor,
    prevCursor,
    retailers,
  };
}
