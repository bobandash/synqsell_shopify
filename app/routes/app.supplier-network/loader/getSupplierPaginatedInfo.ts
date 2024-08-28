import { errorHandler } from '~/services/util';
import db from '~/db.server';
import { ROLES } from '~/constants';
import { boolean, object, string } from 'yup';

export type SupplierPaginatedInfoProps = {
  firstSupplierId: string;
  hasMore: boolean;
  nextCursor: string | null;
  prevCursor: string | null;
  suppliers: Supplier[];
};

export type Supplier = {
  id: string;
  profile: Profile;
  priceList: {
    id: string;
    requiresApprovalToImport: boolean;
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

const getSupplierInfoSchema = object({
  isReverseDirection: boolean().required(),
  firstSupplierId: string().optional(),
  cursor: string().optional(),
})
  .test(
    'cursor-first-supplier-id-not-nullable',
    'Both supplier ID and cursor must be provided together or not at all.',
    (values) => {
      const { firstSupplierId, cursor } = values;
      if ((!firstSupplierId && cursor) || (firstSupplierId && !cursor)) {
        return false;
      }
      return true;
    },
  )
  .test(
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

export async function getSupplierPaginatedInfo(
  isReverseDirection: boolean,
  firstSupplierId?: string,
  cursor?: string,
) {
  try {
    await getSupplierInfoSchema.validate({
      isReverseDirection,
      firstSupplierId,
      cursor,
    });
    // the only suppliers that should show up are suppliers with a general price list and at least one product in the price list
    // and they purposely set themselves as visible in the supplier network
    const take = 8;
    const suppliersRawData = await db.session.findMany({
      take: isReverseDirection ? -1 * take : take + 1,
      ...(cursor && { cursor: { id: cursor } }),
      ...(cursor && { skip: 1 }),
      where: {
        Role: {
          some: {
            name: ROLES.SUPPLIER,
            isVisibleInNetwork: true,
          },
        },
        Profile: {
          NOT: undefined,
          SocialMediaLink: {
            NOT: undefined,
          },
        },
        PriceList: {
          some: {
            isGeneral: true,
            Product: {
              some: {},
            },
          },
        },
      },
      orderBy: {
        Profile: {
          name: 'asc',
        },
      },
      select: {
        id: true,
        Profile: {
          include: {
            SocialMediaLink: true,
          },
        },
        PriceList: {
          select: {
            id: true,
            isGeneral: true,
            requiresApprovalToImport: true,
          },
        },
      },
    });

    // clean up data
    const suppliers = suppliersRawData.map((supplier) => {
      const { Profile } = supplier;
      // TODO: add error handlers
      if (!Profile) {
        throw new Error('Profile does not exist');
      }
      const { SocialMediaLink, ...profileRest } = Profile;
      if (!SocialMediaLink) {
        throw new Error('Social media link does not exist');
      }
      const generalPriceList = supplier.PriceList.filter(
        (priceList) => priceList.isGeneral === true,
      )[0];

      return {
        id: supplier.id,
        profile: {
          ...profileRest,
          socialMediaLink: { ...SocialMediaLink },
        },
        priceList: {
          id: generalPriceList.id,
          requiresApprovalToImport: generalPriceList.requiresApprovalToImport,
        },
      };
    });

    // calculation for next and prev cursor
    const firstPageSupplierId = firstSupplierId
      ? firstSupplierId
      : suppliers[0].id;
    const isFirstPage =
      !cursor || (suppliers[0] && suppliers[0].id === firstPageSupplierId);

    const hasMore = suppliers.length > take || isReverseDirection;

    // for next direction, we took one extra to check if there are more elements are the cursor
    // this element has to be removed from the data that's returned
    const suppliersArr =
      !isReverseDirection && hasMore ? suppliers.slice(0, -1) : suppliers;
    const prevCursor = isFirstPage ? null : suppliersArr[0].id;
    const nextCursor = hasMore ? suppliersArr[take - 1].id : null;

    return {
      firstSupplierId: firstPageSupplierId,
      hasMore,
      nextCursor,
      prevCursor,
      suppliers: suppliersArr,
    };
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to get supplier information.',
      getSupplierPaginatedInfo,
      { cursor },
    );
  }
}
