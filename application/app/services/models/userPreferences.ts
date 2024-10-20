import db from '../../db.server';
import { errorHandler } from '../util';
import createHttpError from 'http-errors';

export type UserPreferenceData = {
  id: string;
  sessionId: string;
  tableIdsHidden: string[];
};

// function to add or remove table ID from user preferences depending on if it's hidden over visible
export async function hasUserPreferences(sessionId: string): Promise<Boolean> {
  try {
    const userPreferences = await db.userPreference.findFirst({
      where: {
        sessionId: sessionId,
      },
    });
    if (!userPreferences) {
      return false;
    }
    return true;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to check if user preferences exist.',
      hasUserPreferences,
      { sessionId },
    );
  }
}

export async function getUserPreferences(
  sessionId: string,
): Promise<UserPreferenceData> {
  try {
    const userPreferences = await db.userPreference.findFirstOrThrow({
      where: {
        sessionId: sessionId,
      },
    });
    return userPreferences;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to check if profile exists',
      getUserPreferences,
      {
        sessionId,
      },
    );
  }
}

export async function createUserPreferences(
  sessionId: string,
): Promise<UserPreferenceData> {
  try {
    const userPreferencesExist = await hasUserPreferences(sessionId);
    if (userPreferencesExist) {
      throw new createHttpError.BadRequest(
        'User preferences already exist for user.',
      );
    }
    const newUserPreference = await db.userPreference.create({
      data: {
        sessionId: sessionId,
        tableIdsHidden: [],
      },
    });
    return newUserPreference;
  } catch (error) {
    throw errorHandler(
      error,
      `Failed to create user preferences.`,
      createUserPreferences,
      {
        sessionId,
      },
    );
  }
}

export async function getOrCreateUserPreferences(sessionId: string) {
  try {
    const userPreferencesExist = await hasUserPreferences(sessionId);
    if (userPreferencesExist) {
      return getUserPreferences(sessionId);
    }
    return createUserPreferences(sessionId);
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to get or create user preferences.',
      getOrCreateUserPreferences,
      { sessionId },
    );
  }
}

export async function toggleChecklistVisibility(
  sessionId: string,
  tableId: string,
): Promise<UserPreferenceData> {
  try {
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
  } catch (error) {
    throw errorHandler(
      error,
      `Could not toggle checklist table visibility.`,
      toggleChecklistVisibility,
      {
        sessionId,
        tableId,
      },
    );
  }
}
