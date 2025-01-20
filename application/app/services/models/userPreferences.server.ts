import db from '~/db.server';
import createHttpError from 'http-errors';
import { Prisma } from '@prisma/client';

export type UserPreferenceData = {
  id: string;
  sessionId: string;
  tableIdsHidden: string[];
};

// function to add or remove table ID from user preferences depending on if it's hidden over visible
export async function hasUserPreferences(
  sessionId: string,
  tx: Prisma.TransactionClient = db,
): Promise<boolean> {
  const count = await tx.userPreference.count({
    where: { sessionId },
  });
  return count > 0;
}

export async function getUserPreferences(
  sessionId: string,
  tx: Prisma.TransactionClient = db,
): Promise<UserPreferenceData> {
  return tx.userPreference.findFirstOrThrow({
    where: { sessionId },
  });
}

export async function createUserPreferences(
  sessionId: string,
  tx: Prisma.TransactionClient = db,
): Promise<UserPreferenceData> {
  const exists = await hasUserPreferences(sessionId, tx);

  if (exists) {
    throw new createHttpError.BadRequest('User already has user preferences.');
  }

  return tx.userPreference.create({
    data: {
      sessionId,
      tableIdsHidden: [],
    },
  });
}

export async function getOrCreateUserPreferences(
  sessionId: string,
  tx: Prisma.TransactionClient = db,
) {
  const exists = await hasUserPreferences(sessionId, tx);

  if (exists) {
    return getUserPreferences(sessionId, tx);
  }

  return createUserPreferences(sessionId, tx);
}

export async function toggleChecklistVisibility(
  sessionId: string,
  tableId: string,
  tx: Prisma.TransactionClient = db,
): Promise<UserPreferenceData> {
  const { tableIdsHidden, id } = await getUserPreferences(sessionId, tx);
  const newTableIdsHidden = tableIdsHidden.includes(tableId)
    ? tableIdsHidden.filter((id) => id !== tableId)
    : [...tableIdsHidden, tableId];

  return tx.userPreference.update({
    where: { id },
    data: { tableIdsHidden: newTableIdsHidden },
  });
}
