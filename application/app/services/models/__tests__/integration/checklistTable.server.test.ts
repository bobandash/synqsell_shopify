import db from '~/db.server';
import { v4 as uuidv4 } from 'uuid';
import { createSampleChecklistTable } from '@factories/checklist.factories';
import {
  sampleChecklistItemOne,
  sampleChecklistItemTwo,
  sampleChecklistStatusOne,
  sampleChecklistStatusTwo,
  sampleChecklistTable,
} from '@fixtures/checklist.fixture';
import {
  createMissingChecklistStatuses,
  getMissingChecklistIds,
  getTablesAndStatuses,
  hasChecklistTable,
} from '../../checklistTable.server';
import { sampleSession } from '@fixtures/session.fixture';

describe('Checklist Table', () => {
  beforeEach(async () => {
    await createSampleChecklistTable();
  });

  const nonExistentId = uuidv4();
  describe('hasChecklistTable', () => {
    it('should return true when checklist table exists', async () => {
      const tableExists = await hasChecklistTable(sampleChecklistTable.id);
      expect(tableExists).toBe(true);
    });

    it('should return false if checklist table id is invalid', async () => {
      const tableExists = await hasChecklistTable(nonExistentId);
      expect(tableExists).toBe(false);
    });
  });

  describe('createMissingChecklistStatuses', () => {
    it('should create 1 checklist status if specify 1 checklist id.', async () => {
      await createMissingChecklistStatuses(
        [sampleChecklistItemOne.id],
        sampleSession.id,
      );
      const numChecklistStatus = await db.checklistStatus.count({});
      expect(numChecklistStatus).toBe(1);
    });

    it('should create 2 checklist status if specify 2 checklist id.', async () => {
      await createMissingChecklistStatuses(
        [sampleChecklistItemOne.id, sampleChecklistItemTwo.id],
        sampleSession.id,
      );
      const numChecklistStatus = await db.checklistStatus.count({});
      expect(numChecklistStatus).toBe(2);
    });

    it('should throw if session id is invalid', async () => {
      await expect(
        createMissingChecklistStatuses(
          [sampleChecklistItemOne.id, sampleChecklistItemTwo.id],
          nonExistentId,
        ),
      ).rejects.toThrow();
    });

    it('should throw if checklist item id is invalid', async () => {
      await expect(
        createMissingChecklistStatuses(
          [nonExistentId, sampleChecklistItemTwo.id],
          sampleSession.id,
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
          checklistItemId: sampleChecklistItemOne.id,
          isCompleted: false,
          sessionId: sampleSession.id,
        },
      });
      const checklistIds = await getMissingChecklistIds(sampleSession.id);
      expect(checklistIds).toEqual([sampleChecklistItemTwo.id]);
    });

    it('should return empty array when there are no checklist items', async () => {
      await db.checklistItem.deleteMany();
      const checklistIds = await getMissingChecklistIds(sampleSession.id);
      expect(checklistIds).toEqual([]);
    });
  });

  describe('getTablesAndStatuses', () => {
    beforeEach(async () => {
      await db.checklistStatus.create({ data: sampleChecklistStatusOne });
      await db.checklistStatus.create({ data: sampleChecklistStatusTwo });
    });

    it('should return table status with all details for frontend', async () => {
      const expectedData = [
        {
          checklistItems: [
            {
              button: {
                action: null,
                content: 'Get Access',
              },
              checklistTableId: 'checklist-table-1',
              header: 'Become a retailer',
              id: 'checklist-item-1',
              isActive: true,
              isCompleted: false,
              key: 'retailer_get_started',
              position: 1,
              subheader:
                "Click get access to add SynqSell's functionality onto your store and start importing products from our supplier network.",
            },
            {
              button: {
                action: null,
                content: 'Edit Brand Profile',
              },
              checklistTableId: 'checklist-table-1',
              header: 'Customize your brand profile',
              id: 'checklist-item-2',
              isActive: false,
              isCompleted: false,
              key: 'retailer_customize_profile',
              position: 2,
              subheader:
                'Showcase the information you would like to display in the retailer network for suppliers to see.',
            },
          ],
          header: 'Retailer Setup Guide',
          id: 'checklist-table-1',
          isHidden: true,
          position: 1,
          subheader:
            'Follow the steps below to import products from suppliers on our platform.',
        },
      ];
      const tablesAndStatus = await getTablesAndStatuses(sampleSession.id);
      expect(tablesAndStatus).toEqual(expectedData);
    });
  });
});
