import { simpleFaker } from '@faker-js/faker';
import { createSampleChecklistTable } from '@factories/checklist.factories';
import {
  sampleChecklistItemOne,
  sampleChecklistStatusOne,
  sampleChecklistStatusTwo,
  sampleUserPreference,
} from '@fixtures/checklist.fixture';
import {
  getChecklistStatus,
  getChecklistStatusBatch,
  hasChecklistStatus,
  isChecklistStatusCompleted,
  isValidChecklistStatusId,
  markCheckListStatus,
  updateChecklistStatus,
  updateChecklistStatusBatchTx,
  updateChecklistStatusTx,
} from '../../checklistStatus.server';
import db from '~/db.server';
import { sampleSession } from '@fixtures/session.fixture';
import { createSampleSession } from '@factories/session.factories';
import type { ChecklistStatus } from '@prisma/client';
import type { Session } from '../../session.server';
import type { ChecklistItemKeysOptions } from '~/constants';

describe('Checklist Status', () => {
  const nonExistentId = simpleFaker.string.uuid();

  describe('One user', () => {
    let checklistStatusOne: ChecklistStatus;
    let checklistStatusTwo: ChecklistStatus;

    beforeEach(async () => {
      await createSampleChecklistTable();
      await createSampleSession();
      checklistStatusOne = sampleChecklistStatusOne(sampleSession.id);
      checklistStatusTwo = sampleChecklistStatusTwo(sampleSession.id);

      await db.checklistStatus.create({ data: checklistStatusOne });
      await db.checklistStatus.create({ data: checklistStatusTwo });
      await db.userPreference.create({
        data: sampleUserPreference(sampleSession.id),
      });
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
        const exists = await hasChecklistStatus(
          sampleSession.id,
          sampleChecklistItemOne.id,
        );
        expect(exists).toBe(true);
      });

      it('should return false for non-existent checklist status ID', async () => {
        const exists = await hasChecklistStatus(
          sampleSession.id,
          nonExistentId,
        );
        expect(exists).toBe(false);
      });

      it('should return false for non-existent session id.', async () => {
        const isValid = await hasChecklistStatus(
          nonExistentId,
          sampleChecklistItemOne.id,
        );
        expect(isValid).toBe(false);
      });
    });

    describe('getChecklistStatus', () => {
      it('should return checklist status if exists', async () => {
        const status = await getChecklistStatus(
          sampleSession.id,
          sampleChecklistItemOne.id,
        );
        expect(status.sessionId).toBe(sampleSession.id);
        expect(status.checklistItemId).toBe(sampleChecklistItemOne.id);
      });

      it('should throw error if checklist status does not exist', async () => {
        await expect(
          getChecklistStatus(sampleSession.id, nonExistentId),
        ).rejects.toThrow();
      });

      it('should throw error if session id is invalid', async () => {
        await expect(
          getChecklistStatus(nonExistentId, sampleChecklistItemOne.id),
        ).rejects.toThrow();
      });
    });

    describe('isChecklistStatusCompleted', () => {
      it('should return false if checklist status is not completed.', async () => {
        const isCompleted = await isChecklistStatusCompleted(
          sampleSession.id,
          sampleChecklistItemOne.id,
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
          sampleSession.id,
          sampleChecklistItemOne.id,
        );

        expect(isCompleted).toBe(true);
      });

      it('should throw error if session id is invalid', async () => {
        await expect(
          isChecklistStatusCompleted(nonExistentId, sampleChecklistItemOne.id),
        ).rejects.toThrow();
      });

      it('should throw error if checklistItemId is invalid', async () => {
        await expect(
          isChecklistStatusCompleted(sampleSession.id, nonExistentId),
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
          sampleSession.id,
          sampleChecklistItemOne.key,
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
          sampleSession.id,
          sampleChecklistItemOne.key,
          true,
        );
        await updateChecklistStatus(
          sampleSession.id,
          sampleChecklistItemOne.key,
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
            sampleChecklistItemOne.key,
            true,
          ),
        ).rejects.toThrow();
      });
    });

    describe('updateChecklistStatusTx', () => {
      it('should update the completed status to true within transaction', async () => {
        await db.$transaction(async (tx) => {
          const initialStatus = await tx.checklistStatus.findFirst({
            where: { id: checklistStatusOne.id },
          });

          await updateChecklistStatusTx(
            tx,
            sampleSession.id,
            sampleChecklistItemOne.key,
            true,
          );
          const newStatus = await tx.checklistStatus.findFirst({
            where: {
              id: checklistStatusOne.id,
            },
          });
          expect(initialStatus?.isCompleted).toBe(false);
          expect(newStatus?.isCompleted).toBe(true);
        });
      });

      it('should update the completed status to false within transaction', async () => {
        await db.$transaction(async (tx) => {
          await updateChecklistStatusTx(
            tx,
            sampleSession.id,
            sampleChecklistItemOne.key,
            true,
          );
          await updateChecklistStatusTx(
            tx,
            sampleSession.id,
            sampleChecklistItemOne.key,
            false,
          );
          const status = await tx.checklistStatus.findFirst({
            where: {
              id: checklistStatusOne.id,
            },
          });
          expect(status?.isCompleted).toBe(false);
        });
      });

      it('should throw error if sessionid is invalid within transaction', async () => {
        await expect(
          db.$transaction(async (tx) => {
            await updateChecklistStatusTx(
              tx,
              nonExistentId,
              sampleChecklistItemOne.key,
              true,
            );
          }),
        ).rejects.toThrow();
      });
    });
  });

  describe('Multiple Users', () => {
    const nonExistentId = simpleFaker.string.uuid();
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
      await createSampleChecklistTable();
      const [sessionOne, sessionTwo] = await Promise.all([
        createSampleSession({
          id: simpleFaker.string.uuid(),
        }),
        createSampleSession({
          id: simpleFaker.string.uuid(),
        }),
      ]);
      userOne = {
        session: sessionOne,
        checklistStatusOne: await db.checklistStatus.create({
          data: sampleChecklistStatusOne(sessionOne.id),
        }),
        checklistStatusTwo: await db.checklistStatus.create({
          data: sampleChecklistStatusTwo(sessionOne.id),
        }),
      };
      userTwo = {
        session: sessionTwo,
        checklistStatusOne: await db.checklistStatus.create({
          data: sampleChecklistStatusOne(sessionTwo.id),
        }),
        checklistStatusTwo: await db.checklistStatus.create({
          data: sampleChecklistStatusTwo(sessionTwo.id),
        }),
      };
    });

    describe('getChecklistStatusBatch', () => {
      it('should return all checklist statuses for all sessions that have checklistItemId', async () => {
        const checklistStatuses = await getChecklistStatusBatch(
          [userOne.session.id, userTwo.session.id],
          sampleChecklistItemOne.id,
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
          sampleChecklistItemOne.id,
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

    describe('updateChecklistStatusBatchTx', () => {
      it('should update completed status for all sessionIds provided in checklist status', async () => {
        await db.$transaction(async (tx) => {
          await updateChecklistStatusBatchTx(
            tx,
            [userOne.session.id, userTwo.session.id],
            sampleChecklistItemOne.key,
            true,
          );
        });
        const statuses = await db.checklistStatus.findMany({
          where: {
            sessionId: { in: [userOne.session.id, userTwo.session.id] },
            checklistItemId: sampleChecklistItemOne.id,
          },
        });
        expect(statuses).toHaveLength(2);
        expect(statuses.every((status) => status.isCompleted)).toBe(true);
      });

      it('should update status from completed to not completed', async () => {
        await db.$transaction(async (tx) => {
          await updateChecklistStatusBatchTx(
            tx,
            [userOne.session.id, userTwo.session.id],
            sampleChecklistItemOne.key,
            true,
          );
          await updateChecklistStatusBatchTx(
            tx,
            [userOne.session.id, userTwo.session.id],
            sampleChecklistItemOne.key,
            false,
          );
        });

        const statuses = await db.checklistStatus.findMany({
          where: {
            sessionId: { in: [userOne.session.id, userTwo.session.id] },
            checklistItemId: sampleChecklistItemOne.id,
          },
        });
        expect(statuses.every((s) => !s.isCompleted)).toBe(true);
      });

      it('should throw error for invalid checklist item key', async () => {
        await expect(
          db.$transaction(async (tx) => {
            await updateChecklistStatusBatchTx(
              tx,
              [userOne.session.id],
              simpleFaker.string.uuid() as ChecklistItemKeysOptions,
              true,
            );
          }),
        ).rejects.toThrow();
      });
    });
  });
});
