import type { GraphQL } from '~/types';
import { getProfile, hasProfile } from '~/services/models/userProfile';
import {
  getProfileDefaults,
  type ProfileDefaults,
} from '~/services/shopify/profile';
import db from '~/db.server';
import { errorHandler } from '~/lib/utils/server';

export async function createProfile(
  sessionId: string,
  profileDefaults: ProfileDefaults,
) {
  try {
    // creates new profile
    await db.$transaction(async (tx) => {
      const newProfile = await tx.userProfile.create({
        data: {
          sessionId,
          ...profileDefaults,
        },
      });
      await tx.socialMediaLink.create({
        data: { userProfileId: newProfile.id },
      });
    });

    const newProfileWithSocialMedia = await getProfile(sessionId);
    return newProfileWithSocialMedia;
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

export async function getOrCreateProfile(sessionId: string, graphql: GraphQL) {
  try {
    const profileExists = await hasProfile(sessionId);
    let profile = null;
    if (profileExists) {
      profile = await getProfile(sessionId);
    } else {
      const profileDefaults = await getProfileDefaults(sessionId, graphql);
      profile = await createProfile(sessionId, profileDefaults);
    }
    return profile;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to get or create profile.',
      getOrCreateProfile,
      { sessionId },
    );
  }
}
