import type { Prisma } from '@prisma/client';
import { ROLES } from '~/constants';
import db from '~/db.server';
import { errorHandler } from '../util';

type ProfileDefaultsProps = {
  name: string;
  email: string;
  biography: string;
  website: string;
  address: string;
};

export type ProfileProps = {
  id: string;
  name: string;
  email: string;
  logo: string | null;
  biography: string | null;
  desiredProducts: string | null;
  sessionId: string;
};

type ProfileUpdateProps = {
  name?: string;
  email?: string;
  logo?: string;
  biography?: string;
  productsWant?: string;
  socialMediaUrls?: string[];
};

export type SocialMediaDataProps = {
  facebook: string;
  twitter: string;
  instagram: string;
  youtube: string;
  tiktok: string;
};

export async function hasProfile(sessionId: string) {
  try {
    const profile = await db.userProfile.findFirst({
      where: {
        sessionId,
      },
    });

    if (!profile) {
      return false;
    }
    return true;
  } catch (error) {
    throw errorHandler(error, 'Failed to check if profile exists', hasProfile, {
      sessionId,
    });
  }
}

export async function getProfile(sessionId: string) {
  try {
    const profile = await db.userProfile.findFirstOrThrow({
      where: {
        sessionId,
      },
      include: {
        socialMediaLink: true,
      },
    });
    return profile;
  } catch (error) {
    throw errorHandler(error, 'Failed to retrieve profile.', getProfile, {
      sessionId,
    });
  }
}

export async function createProfile(
  sessionId: string,
  profileDefaults: ProfileDefaultsProps,
) {
  try {
    // creates profile with social media links or rollback
    const profileWithSocialMediaLinks = await db.$transaction(async (tx) => {
      const newProfile = await tx.userProfile.create({
        data: {
          sessionId,
          ...profileDefaults,
        },
      });
      await tx.socialMediaLink.create({
        data: { userProfileId: newProfile.id },
      });

      const newProfileWithSocialMediaLinks =
        await tx.userProfile.findFirstOrThrow({
          where: {
            id: newProfile.id,
          },
          include: {
            socialMediaLink: true,
          },
        });
      return newProfileWithSocialMediaLinks;
    });
    return profileWithSocialMediaLinks;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to create profile in database.',
      createProfile,
      {
        sessionId,
        profileDefaults,
      },
    );
  }
}

export async function updateUserProfileTx(
  tx: Prisma.TransactionClient,
  sessionId: string,
  newProfileValues: ProfileUpdateProps,
  socialMediaData: SocialMediaDataProps,
) {
  try {
    const updatedProfile = await tx.userProfile.update({
      where: {
        sessionId,
      },
      data: {
        ...newProfileValues,
        socialMediaLink: {
          update: {
            ...socialMediaData,
          },
        },
      },
    });
    return updatedProfile;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to update profile in transaction.',
      updateUserProfileTx,
      {
        sessionId,
        newProfileValues,
        socialMediaData,
      },
    );
  }
}

async function getPaginatedVisibleProfiles(
  cursor: string | null,
  isReverse: boolean,
  role: string,
) {
  const profilesRawData = await db.role.findMany({
    take: isReverse ? -12 : 12,
    skip: cursor ? 1 : 0,
    where: {
      name: role,
      isVisibleInNetwork: true,
    },
    select: {
      id: true,
      session: {
        include: {
          userProfile: true,
        },
      },
    },
    ...(cursor && { cursor: { id: cursor } }),
    orderBy: {
      session: {
        userProfile: {
          name: 'asc' as Prisma.SortOrder,
        },
      },
    },
  });
  const profiles = profilesRawData
    .map((role) => {
      return { roleId: role.id, ...role.session.userProfile };
    })
    .filter((profile) => profile.id !== undefined);
  return profiles;
}

export async function getVisibleRetailerProfiles(
  startCursor: string | null,
  endCursor: string | null,
  isReverse: boolean,
) {
  try {
    const cursor = isReverse ? startCursor : endCursor;
    const profiles = await getPaginatedVisibleProfiles(
      cursor,
      isReverse,
      ROLES.RETAILER,
    );

    if (!profiles) {
      return {
        profiles: [],
        hasPrevious: false,
        hasNext: false,
        previousCursor: null,
        nextCursor: null,
      };
    }

    const lastIndex = profiles.length - 1;
    const previousCursor = profiles[0].roleId;
    const nextCursor = profiles[lastIndex].roleId;

    const hasPrevious =
      (await getPaginatedVisibleProfiles(previousCursor, true, ROLES.RETAILER))
        .length > 0;
    const hasNext =
      (await getPaginatedVisibleProfiles(nextCursor, true, ROLES.RETAILER))
        .length > 0;

    return {
      profiles,
      hasPrevious,
      hasNext,
      previousCursor,
      nextCursor,
    };
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to update profile in transaction.',
      getVisibleRetailerProfiles,
      {
        startCursor,
        endCursor,
        isReverse,
      },
    );
  }
}
