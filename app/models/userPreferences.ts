import { errorHandler, getLogCombinedMessage, getLogContext } from "~/util";
import db from "../db.server";
import { hasChecklistTable } from "./checklistTable";
import type { UserPreferenceData } from "./types";
import createHttpError from "http-errors";
import logger from "logger";

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
    const context = getLogContext(hasUserPreferences, sessionId);
    throw errorHandler(
      error,
      context,
      "Failed to check if user preferences exist. Please try again later.",
    );
  }
}

export async function getUserPreferences(
  sessionId: string,
): Promise<UserPreferenceData> {
  try {
    const userPreferences = await db.userPreference.findFirst({
      where: {
        sessionId: sessionId,
      },
    });
    if (!userPreferences) {
      const logMessage = getLogCombinedMessage(
        getUserPreferences,
        `User has no user preferences.`,
        sessionId,
      );
      logger.error(logMessage);
      throw new createHttpError.NotFound(
        `User has no user preferences. Please contact support.`,
      );
    }
    return userPreferences;
  } catch (error) {
    const context = getLogContext(getUserPreferences, sessionId);
    throw errorHandler(
      error,
      context,
      "Failed to retrieve user preferences. Please try again later.",
    );
  }
}

async function validateCreateUserPreferences(sessionId: string) {
  try {
    if (await hasUserPreferences(sessionId)) {
      const logMessage = getLogCombinedMessage(
        validateCreateUserPreferences,
        `User preferences already exists for user.`,
        sessionId,
      );
      logger.error(logMessage);
      throw new createHttpError.BadRequest(
        `User preferences already exists for user. Please contact support.`,
      );
    }
  } catch (error) {
    const context = getLogContext(validateCreateUserPreferences, sessionId);
    throw errorHandler(
      error,
      context,
      "User preferences already exists for user. Please contact support.",
    );
  }
}

export async function createUserPreferences(
  sessionId: string,
): Promise<UserPreferenceData> {
  try {
    await validateCreateUserPreferences(sessionId);
    const newUserPreference = await db.userPreference.create({
      data: {
        sessionId: sessionId,
        tableIdsHidden: [],
      },
    });
    return newUserPreference;
  } catch (error) {
    const context = getLogContext(createUserPreferences, sessionId);
    throw errorHandler(
      error,
      context,
      "Could not create user preferences. Please contact support.",
    );
  }
}

export async function validateToggleChecklistVisibility(
  sessionId: string,
  tableId: string,
) {
  try {
    const checklistTableExists = await hasChecklistTable(tableId);
    const userPreferenceExists = await hasUserPreferences(sessionId);
    if (!checklistTableExists || !userPreferenceExists) {
      const errors = [];
      if (!checklistTableExists) {
        errors.push("Table id is invalid.");
      }
      if (!userPreferenceExists) {
        errors.push("This shop does not have user preferences.");
      }
      const logMessage = getLogCombinedMessage(
        validateToggleChecklistVisibility,
        `User has no user preferences.`,
        sessionId,
        tableId,
      );
      logger.error(logMessage);
      throw new createHttpError.BadRequest(errors.join(" "));
    }
  } catch (error) {
    const context = getLogContext(
      validateToggleChecklistVisibility,
      sessionId,
      tableId,
    );
    throw errorHandler(
      error,
      context,
      "Something went wrong with the checklist table. Please try again later.",
    );
  }
}

export async function toggleChecklistVisibility(
  sessionId: string,
  tableId: string,
): Promise<UserPreferenceData> {
  try {
    await validateToggleChecklistVisibility(sessionId, tableId);
    const currentUserPreference = await getUserPreferences(sessionId);
    // Update user preferences, toggle visibility if doesn't exist
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
    const context = getLogContext(
      toggleChecklistVisibility,
      sessionId,
      tableId,
    );
    throw errorHandler(
      error,
      context,
      "Failed to update checklist visibility. Please try again later.",
    );
  }
}
