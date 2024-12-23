import db from '~/db.server';
import {
  PARTNERSHIP_REQUEST_STATUS,
  PARTNERSHIP_REQUEST_TYPE,
  ROLES,
} from '~/constants';
import { boolean, object, string } from 'yup';
import { hasSession } from '~/services/models/session.server';
import type { Prisma } from '@prisma/client';
import logger from '~/logger';
import createHttpError from 'http-errors';
import { APPROVAL_STATUS, type ApprovalStatusProps } from '../constants';
import {
  getPartnershipRequest,
  hasPartnershipRequest,
} from '~/services/models/partnershipRequest.server';
import { isRetailerInPartnershipPriceList } from '~/services/models/partnership.server';

export type SupplierPaginatedInfoProps = {
  nextCursor: string | null;
  prevCursor: string | null;
  suppliers: Supplier[];
};

export type Supplier = {
  id: string;
  profile: Profile;
  priceList: {
    id: string;
    approvalStatus: ApprovalStatusProps;
  };
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

type SupplierPaginatedInfoPrisma = Prisma.SessionGetPayload<{
  select: {
    id: true;
    userProfile: {
      include: {
        socialMediaLink: true;
      };
    };
    priceLists: {
      select: {
        id: true;
        isGeneral: true;
        requiresApprovalToImport: true;
      };
    };
  };
}>;

type GetSupplierPaginatedInfoProps = {
  isReverseDirection: boolean;
  sessionId: string;
  cursor: string | null;
};

type GetPrismaUnformattedSupplierInfo = GetSupplierPaginatedInfoProps & {
  take: number;
};

const getSupplierInfoSchema = object({
  isReverseDirection: boolean().required(),
  cursor: string().nullable(),
  sessionId: string()
    .required()
    .test(
      'session-id-is-valid',
      'Session id has to be in database',
      async (sessionId) => {
        return await hasSession(sessionId);
      },
    ),
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

async function getPrismaUnformattedSupplierInfo({
  isReverseDirection,
  sessionId,
  take,
  cursor,
}: GetPrismaUnformattedSupplierInfo) {
  const data = await db.session.findMany({
    take: isReverseDirection ? -1 * take : take + 1,
    ...(cursor && { cursor: { id: cursor } }),
    ...(cursor && { skip: 1 }),
    where: {
      id: {
        not: sessionId,
      },
      stripeConnectAccount: {
        stripeAccountId: {
          not: undefined,
        },
      },
      isAppUninstalled: {
        not: true,
      },
      roles: {
        some: {
          name: ROLES.SUPPLIER,
          isVisibleInNetwork: true,
        },
      },
      userProfile: {
        NOT: undefined,
        socialMediaLink: {
          NOT: undefined,
        },
      },
      priceLists: {
        some: {
          isGeneral: true,
          products: {
            some: {},
          },
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
      priceLists: {
        select: {
          id: true,
          isGeneral: true,
          requiresApprovalToImport: true,
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

async function getApprovalStatus(
  sessionId: string,
  priceListId: string,
  requiresApprovalToImport: boolean,
) {
  const [isApprovedRetailer, partnershipRequestExists] = await Promise.all([
    isRetailerInPartnershipPriceList(sessionId, priceListId),
    hasPartnershipRequest(
      priceListId,
      sessionId,
      PARTNERSHIP_REQUEST_TYPE.RETAILER,
    ),
  ]);
  if (isApprovedRetailer) {
    return APPROVAL_STATUS.HAS_ACCESS;
  }
  if (!requiresApprovalToImport) {
    return APPROVAL_STATUS.NO_ACCESS_REQUIRED;
  }

  if (partnershipRequestExists) {
    const partnershipRequest = await getPartnershipRequest(
      priceListId,
      sessionId,
      PARTNERSHIP_REQUEST_TYPE.RETAILER,
    );
    if (partnershipRequest.status === PARTNERSHIP_REQUEST_STATUS.PENDING) {
      return APPROVAL_STATUS.REQUESTED_ACCESS;
    }
  }
  return APPROVAL_STATUS.NO_ACCESS;
}

async function cleanUpSupplierPrismaData(
  suppliersRawData: SupplierPaginatedInfoPrisma[],
  sessionId: string,
) {
  // cleans up supplier data and adds approval status to the prisma data
  const suppliers = await Promise.all(
    suppliersRawData.map(async (supplier) => {
      const { userProfile } = supplier;
      if (!userProfile) {
        logger.error('User profile does not exist in session.');
        throw new createHttpError.InternalServerError(
          `A supplier's user profile does not exist.`,
        );
      }
      const { socialMediaLink, ...profileRest } = userProfile;
      if (!socialMediaLink) {
        logger.error('Social media links does not exist in session.');
        throw new createHttpError.InternalServerError(
          `A supplier's socials does not exist.`,
        );
      }
      const generalPriceList = supplier.priceLists.filter(
        (priceList) => priceList.isGeneral === true,
      )[0];
      // default schema validation: requiresApprovalToImport will always have a value for the general price list
      const approvalStatus = await getApprovalStatus(
        sessionId,
        generalPriceList.id,
        generalPriceList.requiresApprovalToImport ?? false,
      );
      return {
        id: supplier.id,
        profile: {
          ...profileRest,
          socialMediaLink: { ...socialMediaLink },
        },
        priceList: {
          id: generalPriceList.id,
          approvalStatus,
        },
      };
    }),
  );
  return suppliers;
}

export async function getSupplierPaginatedInfo({
  isReverseDirection,
  sessionId,
  cursor,
}: GetSupplierPaginatedInfoProps) {
  await getSupplierInfoSchema.validate({
    isReverseDirection,
    cursor,
    sessionId,
  });

  const take = 8;
  const [firstSupplier, { data: suppliersRawData, hasMore }] =
    await Promise.all([
      getPrismaUnformattedSupplierInfo({
        isReverseDirection: false,
        sessionId,
        take: 1,
        cursor: null,
      }),
      getPrismaUnformattedSupplierInfo({
        isReverseDirection,
        sessionId,
        take,
        cursor,
      }),
    ]);

  const firstSupplierId =
    firstSupplier.data.length > 0 ? firstSupplier.data[0].id : null;
  const suppliers = await cleanUpSupplierPrismaData(
    suppliersRawData,
    sessionId,
  );

  // case: there is no data in the network
  if (suppliers.length === 0) {
    return {
      nextCursor: null,
      prevCursor: null,
      suppliers: [],
    };
  }

  const isFirstPage =
    suppliers[0] && suppliers[0].id === firstSupplierId ? true : false;
  const prevCursor = isFirstPage ? null : suppliers[0].id;
  const nextCursor = hasMore ? suppliers[take - 1].id : null;
  return {
    nextCursor,
    prevCursor,
    suppliers,
  };
}
