import db from "../db.server";
import { hasChecklistTable } from "./checklistTable";
import type { UserPreferenceData } from "./types";
import createError from "http-errors";

// function to add or remove table ID from user preferences depending on if it's hidden over visible
async function hasUserPreferences(shop: string): Promise<Boolean> {
  try {
    const userPreferences = await db.userPreference.findFirst({
      where: {
        shop: shop,
      },
    });
    if (!userPreferences) {
      return false;
    }
    return true;
  } catch (error) {
    throw new createError.InternalServerError(
      "Failed to retrieve checklist table.",
    );
  }
}

async function getUserPreferences(shop: string): Promise<UserPreferenceData> {
  try {
    const userPreferences = await db.userPreference.findFirst({
      where: {
        shop: shop,
      },
    });
    if (!userPreferences) {
      throw new Error("No user preferences found for this shop.");
    }
    return userPreferences;
  } catch (error) {
    throw new Error(`Failed to retrieve user preferences.`);
  }
}

async function createUserPreferences(
  shop: string,
): Promise<UserPreferenceData> {
  try {
    const newUserPreference = await db.userPreference.create({
      data: {
        shop: shop,
        tableIdsHidden: [],
      },
    });
    return newUserPreference;
  } catch (error) {
    throw new Error("Failed to create user preferences");
  }
}

async function toggleChecklistVisibility(
  shop: string,
  tableId: string,
): Promise<UserPreferenceData> {
  try {
    // error validation
    const checklistTableExists = await hasChecklistTable(tableId);
    const userPreferenceExists = await hasUserPreferences(shop);
    if (!checklistTableExists || !userPreferenceExists) {
      const errors = [];
      if (!checklistTableExists) {
        errors.push("Table id is invalid.");
      }
      if (!userPreferenceExists) {
        errors.push("This shop does not have user preferences.");
      }
      throw new Error(errors.join(" "));
    }

    const currentUserPreference = await getUserPreferences(shop);
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
  } catch {
    throw new Error("Failed to update checklist visibility.");
  }
}

export {
  hasUserPreferences,
  getUserPreferences,
  createUserPreferences,
  toggleChecklistVisibility,
};
