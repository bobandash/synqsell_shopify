import db from '~/db.server';
import createHttpError from 'http-errors';

export type UserPreferenceData = {
  id: string;
  sessionId: string;
  tableIdsHidden: string[];
};

// function to add or remove table ID from user preferences depending on if it's hidden over visible
export async function hasUserPreferences(sessionId: string): Promise<Boolean> {
  const userPreferences = await db.userPreference.findFirst({
    where: {
      sessionId: sessionId,
    },
  });
  if (!userPreferences) {
    return false;
  }
  return true;
}

export async function getUserPreferences(
  sessionId: string,
): Promise<UserPreferenceData> {
  const userPreferences = await db.userPreference.findFirstOrThrow({
    where: {
      sessionId: sessionId,
    },
  });
  return userPreferences;
}

export async function createUserPreferences(
  sessionId: string,
): Promise<UserPreferenceData> {
  const userPreferencesExist = await hasUserPreferences(sessionId);
  if (userPreferencesExist) {
    throw new createHttpError.BadRequest('User already has user preferences.');
  }
  const newUserPreference = await db.userPreference.create({
    data: {
      sessionId: sessionId,
      tableIdsHidden: [],
    },
  });
  return newUserPreference;
}

export async function getOrCreateUserPreferences(sessionId: string) {
  const userPreferencesExist = await hasUserPreferences(sessionId);
  if (userPreferencesExist) {
    return getUserPreferences(sessionId);
  }
  return createUserPreferences(sessionId);
}

export async function toggleChecklistVisibility(
  sessionId: string,
  tableId: string,
): Promise<UserPreferenceData> {
  const currentUserPreference = await getUserPreferences(sessionId);
  const { tableIdsHidden, id: userPreferenceId } = currentUserPreference;
  const newTableIdsHidden = tableIdsHidden.filter((id) => id !== tableId);
  if (!tableIdsHidden.includes(tableId)) {
    newTableIdsHidden.push(tableId);
  }
  const newUserPreferences = await db.userPreference.update({
    where: {
      id: userPreferenceId,
    },
    data: {
      tableIdsHidden: newTableIdsHidden,
    },
  });
  return newUserPreferences;
}
