import { createTestSession } from '@factories/session.factories';
import {
  generateSocialMediaLink,
  generateUserProfile,
} from '@factories/userProfile.factories';
import { simpleFaker } from '@faker-js/faker';
import type { Session, UserProfile } from '@prisma/client';
import {
  getProfile,
  hasProfile,
  updateUserProfileTx,
} from '../../userProfile.server';
import db from '~/db.server';

describe('userProfile', () => {
  let session: Session;
  let userProfile: UserProfile;
  const nonExistentId = simpleFaker.string.uuid();
  beforeEach(async () => {
    session = await createTestSession();
    userProfile = await generateUserProfile(session.id);
  });

  describe('hasProfile', () => {
    it('should return true when session has profile', async () => {
      const res = await hasProfile(session.id);
      expect(res).toBe(true);
    });

    it('should return false when session does not have profile', async () => {
      const res = await hasProfile(nonExistentId);
      expect(res).toBe(false);
    });
  });

  describe('getProfile', () => {
    it('should return profile from session', async () => {
      const res = await getProfile(session.id);
      expect(res).toEqual({ ...userProfile, socialMediaLink: null });
    });

    it('should throw error if session id is invalid', async () => {
      await expect(getProfile(nonExistentId)).rejects.toThrow();
    });

    it('should throw error if profile does not exist', async () => {
      const newSession = await createTestSession();
      await expect(getProfile(newSession.id)).rejects.toThrow();
    });
  });

  describe('updateUserProfileTx', () => {
    const newProfileVals = {
      name: simpleFaker.string.alpha(10),
      email: simpleFaker.string.alpha(10),
      biography: simpleFaker.string.alpha(10),
      desiredProducts: simpleFaker.string.alpha(10),
      logoUrl: simpleFaker.string.alpha(10),
    };
    const socialMediaVals = {
      facebook: simpleFaker.string.alpha(10),
      twitter: simpleFaker.string.alpha(10),
      instagram: simpleFaker.string.alpha(10),
      youtube: simpleFaker.string.alpha(10),
      tiktok: simpleFaker.string.alpha(10),
    };

    it('should throw error if no social media fields exist', async () => {
      await expect(
        db.$transaction(async (tx) => {
          await updateUserProfileTx(
            tx,
            session.id,
            newProfileVals,
            socialMediaVals,
          );
        }),
      ).rejects.toThrow();
    });

    it('should throw error if session does not exist', async () => {
      await expect(
        db.$transaction(async (tx) => {
          await updateUserProfileTx(
            tx,
            nonExistentId,
            newProfileVals,
            socialMediaVals,
          );
        }),
      ).rejects.toThrow();
    });

    it('should update all user profile fields properly', async () => {
      const link = await generateSocialMediaLink(userProfile.id);
      const newProfile = await db.$transaction(async (tx) => {
        const newProfile = await updateUserProfileTx(
          tx,
          session.id,
          newProfileVals,
          socialMediaVals,
        );
        return newProfile;
      });
      const { logoUrl, ...rest } = newProfileVals;
      const socialMediaLinks = await db.socialMediaLink.findFirst({
        where: {
          id: link.id,
        },
      });
      expect(newProfile).toMatchObject({
        ...rest,
        logo: logoUrl,
      });
      expect(socialMediaLinks).toMatchObject({
        ...socialMediaVals,
      });
    });
  });
});
