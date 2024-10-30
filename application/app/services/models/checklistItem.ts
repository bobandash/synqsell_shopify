import db from '~/db.server';
import { errorHandler } from '~/lib/utils/server';
import { type ChecklistItemKeysOptions } from '~/constants';

export async function hasChecklistItem(key: ChecklistItemKeysOptions) {
  try {
    const checklistItem = await db.checklistItem.findFirst({
      where: {
        key: key,
      },
    });
    if (!checklistItem) {
      return false;
    }
    return true;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to retrieve checklist item',
      hasChecklistItem,
      {
        key,
      },
    );
  }
}

export async function checklistItemIdMatchesKey(
  checklistItemId: string,
  key: ChecklistItemKeysOptions,
) {
  try {
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
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to check if check list item matches targeted checklist item key.',
      checklistItemIdMatchesKey,
      {
        key,
      },
    );
  }
}

export async function getChecklistItem(key: ChecklistItemKeysOptions) {
  try {
    const checklistItem = await db.checklistItem.findFirstOrThrow({
      where: {
        key: key,
      },
    });
    return checklistItem;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to retrieve checklist item',
      getChecklistItem,
      {
        key,
      },
    );
  }
}
