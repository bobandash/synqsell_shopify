import type { Prisma } from '@prisma/client';
import db from '~/db.server';

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
  const profile = await db.userProfile.findFirst({
    where: {
      sessionId,
    },
  });

  if (!profile) {
    return false;
  }
  return true;
}

export async function getProfile(sessionId: string) {
  const profile = await db.userProfile.findFirstOrThrow({
    where: {
      sessionId,
    },
    include: {
      socialMediaLink: true,
    },
  });
  return profile;
}

export async function updateUserProfileTx(
  tx: Prisma.TransactionClient,
  sessionId: string,
  newProfileValues: ProfileUpdateProps,
  socialMediaData: SocialMediaDataProps,
) {
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
}
