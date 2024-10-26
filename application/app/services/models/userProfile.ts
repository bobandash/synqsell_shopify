import type { Prisma } from '@prisma/client';
import db from '~/db.server';
import { errorHandler } from '~/lib/utils/server';

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
  name: string;
  email: string;
  biography: string;
  desiredProducts: string;
  logoUrl: string | null;
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

export async function updateUserProfileTx(
  tx: Prisma.TransactionClient,
  sessionId: string,
  newProfileValues: ProfileUpdateProps,
  socialMediaData: SocialMediaDataProps,
) {
  try {
    const { logoUrl, ...newProfileValuesRest } = newProfileValues;
    const updatedProfile = await tx.userProfile.update({
      where: {
        sessionId,
      },
      data: {
        ...newProfileValuesRest,
        ...(logoUrl && { logo: logoUrl }),
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
