import {
  checklistItemIdMatchesKey,
  getChecklistItem,
  hasChecklistItem,
} from '../../checklistItem.server';
import db from '~/db.server';
import { createTestChecklistTableWithItems } from '@db/factories/checklist.factories';
import type { ChecklistItem } from '@prisma/client';
import { simpleFaker } from '@faker-js/faker';
import type { ChecklistItemKeysOptions } from '~/constants';

describe('Checklist Item', () => {
  let checklistItemOne: ChecklistItem;
  let checklistItemTwo: ChecklistItem;
  const nonExistentId = simpleFaker.string.uuid();
  beforeEach(async () => {
    let res = await createTestChecklistTableWithItems();
    checklistItemOne = res.checklistItemOne;
    checklistItemTwo = res.checklistItemTwo;
  });

  describe('hasChecklistItem', () => {
    it('should return true when checklist item key exists', async () => {
      const checklistItemExists = await hasChecklistItem(
        checklistItemOne.key as ChecklistItemKeysOptions,
      );
      expect(checklistItemExists).toBe(true);
    });

    it("should return false if the checklist item key doesn't exists", async () => {
      const checklistItemExists = await hasChecklistItem(
        nonExistentId as ChecklistItemKeysOptions,
      );
      expect(checklistItemExists).toBe(false);
    });
  });

  describe('getChecklistItem', () => {
    it('should return checklist item if it exists', async () => {
      const checklistItem = await getChecklistItem(
        checklistItemOne.key as ChecklistItemKeysOptions,
      );
      expect(checklistItem).toEqual(checklistItemOne);
    });

    it("should throw error if the checklist item doesn't exists", async () => {
      await db.checklistItem.deleteMany({});
      await expect(
        getChecklistItem(checklistItemOne.key as ChecklistItemKeysOptions),
      ).rejects.toThrow();
    });
  });

  describe('checklistItemIdMatchesKey', () => {
    it('should return true if item id and key matches', async () => {
      const matches = await checklistItemIdMatchesKey(
        checklistItemOne.id,
        checklistItemOne.key as ChecklistItemKeysOptions,
      );
      expect(matches).toBe(true);
    });

    it('should return false if item id and key do not match', async () => {
      const matches = await checklistItemIdMatchesKey(
        checklistItemOne.id,
        checklistItemTwo.key as ChecklistItemKeysOptions,
      );
      expect(matches).toBe(false);
    });
  });
});
