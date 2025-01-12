import {
  generateChecklistItemData,
  generateChecklistStatusData,
  generateChecklistTableData,
  generateUserPreferenceData,
} from "@db/fixtures";
import { CHECKLIST_ITEM_KEYS } from "@db/constants";
import type { ChecklistItemKeysOptions } from "@db/constants";
import db from "@db/test-db";
import { createTestSession } from "./session.factories";
import { Prisma, PrismaClient } from "@prisma/client";
type DbClient = PrismaClient | Prisma.TransactionClient;

export const generateChecklistTable = async (
  position: number,
  overrides = {},
  ctx: DbClient = db
) => {
  const data = generateChecklistTableData(position);
  return await ctx.checklistTable.create({
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
  ctx: DbClient = db
) => {
  const data = generateChecklistItemData(key, position, checklistTableId);
  return await ctx.checklistItem.create({
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
  ctx: DbClient = db
) => {
  const data = generateChecklistStatusData(
    sessionId,
    checklistItemId,
    isCompleted
  );
  return await ctx.checklistStatus.create({
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
  ctx: DbClient = db
) => {
  const data = generateUserPreferenceData(sessionId, tableIdsHidden);
  return await ctx.userPreference.create({
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
    checklistTable.id
  );
  const checklistItemTwo = await generateChecklistItem(
    CHECKLIST_ITEM_KEYS.RETAILER_CUSTOMIZE_PROFILE,
    2,
    checklistTable.id
  );
  return { checklistTable, checklistItemOne, checklistItemTwo };
};

export const createTestChecklistTableWithItemsAndStatus = async () => {
  const checklistTable = await generateChecklistTable(1);
  const checklistItemOne = await generateChecklistItem(
    CHECKLIST_ITEM_KEYS.RETAILER_ADD_PAYMENT_METHOD,
    1,
    checklistTable.id
  );
  const checklistItemTwo = await generateChecklistItem(
    CHECKLIST_ITEM_KEYS.RETAILER_CUSTOMIZE_PROFILE,
    2,
    checklistTable.id
  );
  const session = await createTestSession();
  const checklistStatusOne = await generateChecklistStatus(
    session.id,
    checklistItemOne.id,
    false
  );
  const checklistStatusTwo = await generateChecklistStatus(
    session.id,
    checklistItemTwo.id,
    false
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
