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

export async function hasProfile(
  sessionId: string,
  tx: Prisma.TransactionClient = db,
) {
  const count = await tx.userProfile.count({
    where: { sessionId },
  });
  return count > 0;
}

export async function getProfile(
  sessionId: string,
  tx: Prisma.TransactionClient = db,
) {
  return tx.userProfile.findFirstOrThrow({
    where: { sessionId },
    include: {
      socialMediaLink: true,
    },
  });
}

export async function updateUserProfile(
  sessionId: string,
  newProfileValues: ProfileUpdateProps,
  socialMediaData: SocialMediaDataProps,
  tx: Prisma.TransactionClient = db,
) {
  const { logoUrl, ...profileData } = newProfileValues;

  return tx.userProfile.update({
    where: { sessionId },
    data: {
      ...profileData,
      ...(logoUrl && { logo: logoUrl }),
      socialMediaLink: {
        update: socialMediaData,
      },
    },
  });
}
