import type { GraphQL } from '~/types';
import { createProfile, getProfile, hasProfile } from '../models/userProfile';
import { getProfileDefaults } from '../shopify/userProfile';
import { errorHandler } from '../util';

export async function getOrCreateProfile(sessionId: string, graphql: GraphQL) {
  try {
    const existingProfile = await hasProfile(sessionId);
    if (existingProfile) {
      const profile = await getProfile(sessionId);
      return profile;
    }
    const profileDefaults = await getProfileDefaults(sessionId, graphql);
    const newProfile = await createProfile(sessionId, profileDefaults);
    return newProfile;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to get or  create profile.',
      getOrCreateProfile,
      { sessionId },
    );
  }
}
