import {
  generateChecklistItemData,
  generateChecklistStatusData,
  generateChecklistTableData,
  generateUserPreferenceData,
} from '@fixtures';
import { CHECKLIST_ITEM_KEYS } from '~/constants';
import type { ChecklistItemKeysOptions } from '~/constants';
import db from '~/db.server';
import { createTestSession } from './session.factories';

export const generateChecklistTable = async (
  position: number,
  overrides = {},
) => {
  const data = generateChecklistTableData(position);
  return db.checklistTable.create({
    data: {
      ...data,
      ...overrides,
    },
  });
};

export const generateChecklistItem = async (
  key: ChecklistItemKeysOptions,
  position: number,
  checklistTableId: string,
  overrides = {},
) => {
  const data = generateChecklistItemData(key, position, checklistTableId);
  return db.checklistItem.create({
    data: {
      ...data,
      ...overrides,
    },
  });
};

export const generateChecklistStatus = async (
  sessionId: string,
  checklistItemId: string,
  isCompleted: boolean,
  overrides = {},
) => {
  const data = generateChecklistStatusData(
    sessionId,
    checklistItemId,
    isCompleted,
  );
  return db.checklistStatus.create({
    data: {
      ...data,
      ...overrides,
    },
  });
};

export const generateUserPreference = async (
  sessionId: string,
  tableIdsHidden: string[],
  overrides = {},
) => {
  const data = generateUserPreferenceData(sessionId, tableIdsHidden);
  return db.userPreference.create({
    data: {
      ...data,
      ...overrides,
    },
  });
};

export const createTestChecklistTableWithItems = async () => {
  const checklistTable = await generateChecklistTable(1);
  const checklistItemOne = await generateChecklistItem(
    CHECKLIST_ITEM_KEYS.RETAILER_ADD_PAYMENT_METHOD,
    1,
    checklistTable.id,
  );
  const checklistItemTwo = await generateChecklistItem(
    CHECKLIST_ITEM_KEYS.RETAILER_CUSTOMIZE_PROFILE,
    2,
    checklistTable.id,
  );
  return { checklistTable, checklistItemOne, checklistItemTwo };
};

export const createTestChecklistTableWithItemsAndStatus = async () => {
  const checklistTable = await generateChecklistTable(1);
  const checklistItemOne = await generateChecklistItem(
    CHECKLIST_ITEM_KEYS.RETAILER_ADD_PAYMENT_METHOD,
    1,
    checklistTable.id,
  );
  const checklistItemTwo = await generateChecklistItem(
    CHECKLIST_ITEM_KEYS.RETAILER_CUSTOMIZE_PROFILE,
    2,
    checklistTable.id,
  );
  const session = await createTestSession();
  const checklistStatusOne = await generateChecklistStatus(
    session.id,
    checklistItemOne.id,
    false,
  );
  const checklistStatusTwo = await generateChecklistStatus(
    session.id,
    checklistItemTwo.id,
    false,
  );

  const userPreference = await generateUserPreference(session.id, []);

  return {
    checklistTable,
    checklistItemOne,
    checklistItemTwo,
    checklistStatusOne,
    checklistStatusTwo,
    userPreference,
    session,
  };
};
