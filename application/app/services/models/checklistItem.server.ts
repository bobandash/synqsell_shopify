import db from '~/db.server';
import { type ChecklistItemKeysOptions } from '~/constants';
import type { Prisma } from '@prisma/client';

export async function hasChecklistItem(
  key: ChecklistItemKeysOptions,
  tx: Prisma.TransactionClient = db,
) {
  const count = await tx.checklistItem.count({
    where: { key },
  });
  return count > 0;
}

export async function checklistItemIdMatchesKey(
  checklistItemId: string,
  key: ChecklistItemKeysOptions,
  tx: Prisma.TransactionClient = db,
) {
  const count = await tx.checklistItem.count({
    where: {
      key,
      id: checklistItemId,
    },
  });
  return count > 0;
}

export async function getChecklistItem(
  key: ChecklistItemKeysOptions,
  tx: Prisma.TransactionClient = db,
) {
  return tx.checklistItem.findFirstOrThrow({
    where: { key },
  });
}
