import type { GraphQL } from '~/types';
import { getProfile, hasProfile } from '~/services/models/userProfile.server';
import {
  getProfileDefaults,
  type ProfileDefaults,
} from '~/services/shopify/profile';
import db from '~/db.server';

export async function createProfile(
  sessionId: string,
  profileDefaults: ProfileDefaults,
) {
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
}

export async function getOrCreateProfile(sessionId: string, graphql: GraphQL) {
  const profileExists = await hasProfile(sessionId);
  let profile = null;
  if (profileExists) {
    profile = await getProfile(sessionId);
  } else {
    const profileDefaults = await getProfileDefaults(graphql);
    profile = await createProfile(sessionId, profileDefaults);
  }
  return profile;
}
