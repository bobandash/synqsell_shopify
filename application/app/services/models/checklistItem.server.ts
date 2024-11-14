import db from '~/db.server';
import { type ChecklistItemKeysOptions } from '~/constants';

export async function hasChecklistItem(key: ChecklistItemKeysOptions) {
  const checklistItem = await db.checklistItem.findFirst({
    where: {
      key: key,
    },
  });
  if (!checklistItem) {
    return false;
  }
  return true;
}

export async function checklistItemIdMatchesKey(
  checklistItemId: string,
  key: ChecklistItemKeysOptions,
) {
  const matches = await db.checklistItem.findFirst({
    where: {
      key,
      id: checklistItemId,
    },
  });
  if (matches) {
    return true;
  }
  return false;
}

export async function getChecklistItem(key: ChecklistItemKeysOptions) {
  const checklistItem = await db.checklistItem.findFirstOrThrow({
    where: {
      key: key,
    },
  });
  return checklistItem;
}
