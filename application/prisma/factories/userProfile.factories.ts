import {
  generateSocialMediaLinkData,
  generateUserProfileData,
} from '@fixtures';
import db from '~/db.server';

export const generateUserProfile = async (
  sessionId: string,
  overrides = {},
) => {
  const data = generateUserProfileData(sessionId);
  return db.userProfile.create({
    data: {
      ...data,
      ...overrides,
    },
  });
};

export const generateSocialMediaLink = async (
  userProfileId: string,
  overrides = {},
) => {
  const data = generateSocialMediaLinkData(userProfileId);
  return db.socialMediaLink.create({
    data: {
      ...data,
      ...overrides,
    },
  });
};
