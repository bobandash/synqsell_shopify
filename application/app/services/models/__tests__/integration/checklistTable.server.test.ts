import db from '~/db.server';
import {
  createMissingChecklistStatuses,
  getMissingChecklistIds,
  getTablesAndStatuses,
  hasChecklistTable,
} from '../../checklistTable.server';
import { simpleFaker } from '@faker-js/faker';
import {
  createTestChecklistTableWithItems,
  generateChecklistStatus,
  generateUserPreference,
} from '@factories/checklist.factories';
import { createTestSession } from '@factories/session.factories';
import type { ChecklistItem, ChecklistTable, Session } from '@prisma/client';

describe('Checklist Table', () => {
  let checklistTable: ChecklistTable;
  let session: Session;
  let checklistItemOne: ChecklistItem;
  let checklistItemTwo: ChecklistItem;

  beforeEach(async () => {
    const res = await createTestChecklistTableWithItems();
    checklistTable = res.checklistTable;
    checklistItemOne = res.checklistItemOne;
    checklistItemTwo = res.checklistItemTwo;
    session = await createTestSession();
    await generateUserPreference(session.id, []);
  });

  const nonExistentId = simpleFaker.string.uuid();
  describe('hasChecklistTable', () => {
    it('should return true when checklist table exists', async () => {
      const tableExists = await hasChecklistTable(checklistTable.id);
      expect(tableExists).toBe(true);
    });

    it('should return false if checklist table id is invalid', async () => {
      const tableExists = await hasChecklistTable(nonExistentId);
      expect(tableExists).toBe(false);
    });
  });

  describe('createMissingChecklistStatuses', () => {
    it('should create 1 checklist status if specify 1 checklist id.', async () => {
      const oldNumChecklistStatus = await db.checklistStatus.count({});
      await createMissingChecklistStatuses([checklistItemOne.id], session.id);
      const numChecklistStatus = await db.checklistStatus.count({});
      expect(numChecklistStatus).toBe(oldNumChecklistStatus + 1);
    });

    it('should create 2 checklist status if specify 2 checklist id.', async () => {
      const oldNumChecklistStatus = await db.checklistStatus.count({});
      await createMissingChecklistStatuses(
        [checklistItemOne.id, checklistItemTwo.id],
        session.id,
      );
      const numChecklistStatus = await db.checklistStatus.count({});
      expect(numChecklistStatus).toBe(oldNumChecklistStatus + 2);
    });

    it('should throw if session id is invalid', async () => {
      await expect(
        createMissingChecklistStatuses(
          [checklistItemOne.id, checklistItemTwo.id],
          nonExistentId,
        ),
      ).rejects.toThrow();
    });

    it('should throw if checklist item id is invalid', async () => {
      await expect(
        createMissingChecklistStatuses(
          [nonExistentId, checklistItemTwo.id],
          session.id,
        ),
      ).rejects.toThrow();
    });
  });

  describe('getMissingChecklistIds', () => {
    it(`should return all checklist ids that don't have statuses, even if session id is invalid`, async () => {
      const checklistIds = await getMissingChecklistIds(nonExistentId);
      expect(checklistIds.length).toBe(2);
    });

    it(`should return only checklist ids that don't have statuses`, async () => {
      await db.checklistStatus.create({
        data: {
          id: 'random-status-id',
          checklistItemId: checklistItemOne.id,
          isCompleted: false,
          sessionId: session.id,
        },
      });
      const checklistIds = await getMissingChecklistIds(session.id);
      expect(checklistIds).toEqual([checklistItemTwo.id]);
    });

    it('should return empty array when there are no checklist items', async () => {
      await db.checklistItem.deleteMany();
      const checklistIds = await getMissingChecklistIds(session.id);
      expect(checklistIds).toEqual([]);
    });
  });

  describe('getTablesAndStatuses', () => {
    beforeEach(async () => {
      await generateChecklistStatus(session.id, checklistItemOne.id, false);
      await generateChecklistStatus(session.id, checklistItemTwo.id, false);
    });

    it('should return table status with all details for frontend', async () => {
      const expectedData = [
        {
          checklistItems: [
            {
              button: {
                action: null,
                content: checklistItemOne.buttonText,
              },
              checklistTableId: checklistTable.id,
              header: checklistItemOne.header,
              id: checklistItemOne.id,
              isActive: true,
              isCompleted: false,
              key: checklistItemOne.key,
              position: 1,
              subheader: checklistItemOne.subheader,
            },
            {
              button: {
                action: null,
                content: checklistItemTwo.buttonText,
              },
              checklistTableId: checklistTable.id,
              header: checklistItemTwo.header,
              id: checklistItemTwo.id,
              isActive: false,
              isCompleted: false,
              key: checklistItemTwo.key,
              position: 2,
              subheader: checklistItemTwo.subheader,
            },
          ],
          header: checklistTable.header,
          id: checklistTable.id,
          isHidden: false,
          position: checklistTable.position,
          subheader: checklistTable.subheader,
        },
      ];
      const tablesAndStatus = await getTablesAndStatuses(session.id);
      expect(tablesAndStatus).toEqual(expectedData);
    });
  });
});
