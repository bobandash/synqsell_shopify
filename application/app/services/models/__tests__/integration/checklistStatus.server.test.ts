import { simpleFaker } from '@faker-js/faker';
import {
  getChecklistStatus,
  getChecklistStatusBatch,
  hasChecklistStatus,
  isChecklistStatusCompleted,
  isValidChecklistStatusId,
  markCheckListStatus,
  updateChecklistStatus,
  updateChecklistStatusBatch,
} from '../../checklistStatus.server';
import db from '~/db.server';
import type { ChecklistItem, ChecklistStatus } from '@prisma/client';
import type { Session } from '../../session.server';
import type { ChecklistItemKeysOptions } from '~/constants';
import {
  createTestChecklistTableWithItems,
  createTestChecklistTableWithItemsAndStatus,
  generateChecklistStatus,
} from '@db/factories/checklist.factories';
import { createTestSession } from '@db/factories/session.factories';

describe('Checklist Status', () => {
  const nonExistentId = simpleFaker.string.uuid();

  describe('One user', () => {
    let checklistStatusOne: ChecklistStatus;
    let checklistStatusTwo: ChecklistStatus;
    let checklistItemOne: ChecklistItem;
    let sessionId: string;
    beforeEach(async () => {
      const res = await createTestChecklistTableWithItemsAndStatus();
      checklistStatusOne = res.checklistStatusOne;
      checklistStatusTwo = res.checklistStatusTwo;
      checklistItemOne = res.checklistItemOne;
      sessionId = res.session.id;
    });

    describe('isValidChecklistStatusId', () => {
      it('should return true for existing checklist status IDs', async () => {
        const [isValidOne, isValidTwo] = await Promise.all([
          isValidChecklistStatusId(checklistStatusOne.id),
          isValidChecklistStatusId(checklistStatusTwo.id),
        ]);
        expect(isValidOne).toBe(true);
        expect(isValidTwo).toBe(true);
      });

      it('should return false for non-existent checklist status ID', async () => {
        const isValid = await isValidChecklistStatusId(nonExistentId);
        expect(isValid).toBe(false);
      });
    });

    describe('hasChecklistStatus', () => {
      it('should return true if has checklist status', async () => {
        const exists = await hasChecklistStatus(sessionId, checklistItemOne.id);
        expect(exists).toBe(true);
      });

      it('should return false for non-existent checklist status ID', async () => {
        const exists = await hasChecklistStatus(sessionId, nonExistentId);
        expect(exists).toBe(false);
      });

      it('should return false for non-existent session id.', async () => {
        const isValid = await hasChecklistStatus(
          nonExistentId,
          checklistItemOne.id,
        );
        expect(isValid).toBe(false);
      });
    });

    describe('getChecklistStatus', () => {
      it('should return checklist status if exists', async () => {
        const status = await getChecklistStatus(sessionId, checklistItemOne.id);
        expect(status.sessionId).toBe(sessionId);
        expect(status.checklistItemId).toBe(checklistItemOne.id);
      });

      it('should throw error if checklist status does not exist', async () => {
        await expect(
          getChecklistStatus(sessionId, nonExistentId),
        ).rejects.toThrow();
      });

      it('should throw error if session id is invalid', async () => {
        await expect(
          getChecklistStatus(nonExistentId, checklistItemOne.id),
        ).rejects.toThrow();
      });
    });

    describe('isChecklistStatusCompleted', () => {
      it('should return false if checklist status is not completed.', async () => {
        const isCompleted = await isChecklistStatusCompleted(
          sessionId,
          checklistItemOne.id,
        );
        expect(isCompleted).toBe(false);
      });

      it('should return true if checklist status is completed.', async () => {
        await db.checklistStatus.update({
          where: {
            id: checklistStatusOne.id,
          },
          data: {
            isCompleted: true,
          },
        });
        const isCompleted = await isChecklistStatusCompleted(
          sessionId,
          checklistItemOne.id,
        );

        expect(isCompleted).toBe(true);
      });

      it('should throw error if session id is invalid', async () => {
        await expect(
          isChecklistStatusCompleted(nonExistentId, checklistItemOne.id),
        ).rejects.toThrow();
      });

      it('should throw error if checklistItemId is invalid', async () => {
        await expect(
          isChecklistStatusCompleted(sessionId, nonExistentId),
        ).rejects.toThrow();
      });
    });

    describe('markCheckListStatus', () => {
      it('should update the completed status to true', async () => {
        const initialStatus = await db.checklistStatus.findFirst({
          where: { id: checklistStatusOne.id },
        });
        await markCheckListStatus(checklistStatusOne.id, true);
        const newStatus = await db.checklistStatus.findFirst({
          where: {
            id: checklistStatusOne.id,
          },
        });

        expect(initialStatus?.isCompleted).toBe(false);
        expect(newStatus?.isCompleted).toBe(true);
      });

      it('should update the completed status to false', async () => {
        await markCheckListStatus(checklistStatusOne.id, true);
        await markCheckListStatus(checklistStatusOne.id, false);
        const newStatus = await db.checklistStatus.findFirst({
          where: {
            id: checklistStatusOne.id,
          },
        });
        expect(newStatus?.isCompleted).toBe(false);
      });

      it('should throw error if checklist status id is invalid', async () => {
        await expect(
          markCheckListStatus(nonExistentId, false),
        ).rejects.toThrow();
      });
    });

    describe('updateChecklistStatus', () => {
      it('should update the completed status to true', async () => {
        const initialStatus = await db.checklistStatus.findFirst({
          where: { id: checklistStatusOne.id },
        });
        await updateChecklistStatus(
          sessionId,
          checklistItemOne.key as ChecklistItemKeysOptions,
          true,
        );
        const newStatus = await db.checklistStatus.findFirst({
          where: {
            id: checklistStatusOne.id,
          },
        });
        expect(initialStatus?.isCompleted).toBe(false);
        expect(newStatus?.isCompleted).toBe(true);
      });

      it('should update the completed status to false', async () => {
        await updateChecklistStatus(
          sessionId,
          checklistItemOne.key as ChecklistItemKeysOptions,
          true,
        );
        await updateChecklistStatus(
          sessionId,
          checklistItemOne.key as ChecklistItemKeysOptions,
          false,
        );
        const status = await db.checklistStatus.findFirst({
          where: {
            id: checklistStatusOne.id,
          },
        });
        expect(status?.isCompleted).toBe(false);
      });

      it('should throw error if sessionid is invalid', async () => {
        await expect(
          updateChecklistStatus(
            nonExistentId,
            checklistItemOne.key as ChecklistItemKeysOptions,
            true,
          ),
        ).rejects.toThrow();
      });
    });
  });

  describe('Multiple Users', () => {
    const nonExistentId = simpleFaker.string.uuid();
    let checklistItemOne: ChecklistItem;
    let checklistItemTwo: ChecklistItem;
    let userOne: {
      session: Session;
      checklistStatusOne: ChecklistStatus;
      checklistStatusTwo: ChecklistStatus;
    };
    let userTwo: {
      session: Session;
      checklistStatusOne: ChecklistStatus;
      checklistStatusTwo: ChecklistStatus;
    };

    beforeEach(async () => {
      const res = await createTestChecklistTableWithItems();
      checklistItemOne = res.checklistItemOne;
      checklistItemTwo = res.checklistItemTwo;
      const [sessionOne, sessionTwo] = await Promise.all([
        createTestSession(),
        createTestSession(),
      ]);
      userOne = {
        session: sessionOne,
        checklistStatusOne: await generateChecklistStatus(
          sessionOne.id,
          checklistItemOne.id,
          false,
        ),
        checklistStatusTwo: await generateChecklistStatus(
          sessionOne.id,
          checklistItemTwo.id,
          false,
        ),
      };
      userTwo = {
        session: sessionTwo,
        checklistStatusOne: await generateChecklistStatus(
          sessionOne.id,
          checklistItemOne.id,
          false,
        ),
        checklistStatusTwo: await generateChecklistStatus(
          sessionOne.id,
          checklistItemTwo.id,
          false,
        ),
      };
    });

    describe('getChecklistStatusBatch', () => {
      it('should return all checklist statuses for all sessions that have checklistItemId', async () => {
        const checklistStatuses = await getChecklistStatusBatch(
          [userOne.session.id, userTwo.session.id],
          checklistItemOne.id,
        );
        expect(checklistStatuses).toHaveLength(2);
        checklistStatuses.forEach((status) => {
          expect(status).toMatchObject({
            checklistItemId: expect.any(String),
            id: expect.any(String),
            isCompleted: expect.any(Boolean),
            sessionId: expect.any(String),
          });
        });
      });

      it('should return empty array if sessionId is nonexistent', async () => {
        const checklistStatuses = await getChecklistStatusBatch(
          [nonExistentId],
          checklistItemOne.id,
        );
        expect(checklistStatuses).toHaveLength(0);
      });

      it('should return empty array if checklist item id is invalid', async () => {
        const checklistStatuses = await getChecklistStatusBatch(
          [userOne.session.id],
          nonExistentId,
        );
        expect(checklistStatuses).toHaveLength(0);
      });
    });

    describe('updateChecklistStatusBatch', () => {
      it('should update completed status for all sessionIds provided in checklist status', async () => {
        await updateChecklistStatusBatch(
          [userOne.session.id, userTwo.session.id],
          checklistItemOne.key as ChecklistItemKeysOptions,
          true,
        );
        const statuses = await db.checklistStatus.findMany({
          where: {
            sessionId: { in: [userOne.session.id, userTwo.session.id] },
            checklistItemId: checklistItemOne.id,
          },
        });
        expect(statuses).toHaveLength(2);
        expect(statuses.every((status) => status.isCompleted)).toBe(true);
      });

      it('should update status from completed to not completed', async () => {
        await updateChecklistStatusBatch(
          [userOne.session.id, userTwo.session.id],
          checklistItemOne.key as ChecklistItemKeysOptions,
          true,
        );
        await updateChecklistStatusBatch(
          [userOne.session.id, userTwo.session.id],
          checklistItemOne.key as ChecklistItemKeysOptions,
          false,
        );

        const statuses = await db.checklistStatus.findMany({
          where: {
            sessionId: { in: [userOne.session.id, userTwo.session.id] },
            checklistItemId: checklistItemOne.id,
          },
        });
        expect(statuses.every((s) => !s.isCompleted)).toBe(true);
      });

      it('should throw error for invalid checklist item key', async () => {
        await expect(
          await updateChecklistStatusBatch(
            [userOne.session.id],
            simpleFaker.string.uuid() as ChecklistItemKeysOptions,
            true,
          ),
        ).rejects.toThrow();
      });
    });
  });
});
