import {
  sampleChecklistItemOne,
  sampleChecklistItemTwo,
} from '@fixtures/checklist.fixture';
import {
  checklistItemIdMatchesKey,
  getChecklistItem,
  hasChecklistItem,
} from '../../checklistItem.server';
import db from '~/db.server';
import { createSampleChecklistTable } from '@factories/checklist.factories';

describe('Checklist Item', () => {
  describe('hasChecklistItem', () => {
    it('should return true when checklist item key exists', async () => {
      await createSampleChecklistTable();
      const checklistItemExists = await hasChecklistItem(
        sampleChecklistItemOne.key,
      );
      expect(checklistItemExists).toBe(true);
    });

    it("should return false if the checklist item key doesn't exists", async () => {
      const checklistItemExists = await hasChecklistItem(
        sampleChecklistItemOne.key,
      );
      expect(checklistItemExists).toBe(false);
    });
  });

  describe('getChecklistItem', () => {
    it('should return checklist item if it exists', async () => {
      await createSampleChecklistTable();
      const checklistItem = await getChecklistItem(sampleChecklistItemOne.key);
      expect(checklistItem).toEqual(sampleChecklistItemOne);
    });

    it("should throw error if the checklist item doesn't exists", async () => {
      await db.checklistItem.deleteMany({});
      await expect(
        getChecklistItem(sampleChecklistItemOne.key),
      ).rejects.toThrow();
    });
  });

  describe('checklistItemIdMatchesKey', () => {
    beforeEach(async () => {
      await createSampleChecklistTable();
    });

    it('should return true if item id and key matches', async () => {
      const matches = await checklistItemIdMatchesKey(
        sampleChecklistItemOne.id,
        sampleChecklistItemOne.key,
      );
      expect(matches).toBe(true);
    });

    it('should return false if item id and key do not match', async () => {
      const matches = await checklistItemIdMatchesKey(
        sampleChecklistItemOne.id,
        sampleChecklistItemTwo.key,
      );
      expect(matches).toBe(false);
    });
  });
});
