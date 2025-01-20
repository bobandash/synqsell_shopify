import db from '~/db.server';
import { type Prisma } from '@prisma/client';
import { getChecklistItem } from './checklistItem.server';
import type { ChecklistItemKeysOptions } from '~/constants';

export type ChecklistStatusProps = {
  id: string;
  sessionId: string;
  isCompleted: boolean;
  checklistItemId: string;
};
export async function isValidChecklistStatusId(
  checklistStatusId: string,
  tx: Prisma.TransactionClient = db,
) {
  const count = await tx.checklistStatus.count({
    where: { id: checklistStatusId },
  });
  return count > 0;
}

export async function hasChecklistStatus(
  sessionId: string,
  checklistItemId: string,
  tx: Prisma.TransactionClient = db,
) {
  const count = await tx.checklistStatus.count({
    where: {
      checklistItemId,
      sessionId,
    },
  });
  return count > 0;
}

export async function getChecklistStatus(
  sessionId: string,
  checklistItemId: string,
  tx: Prisma.TransactionClient = db,
) {
  return tx.checklistStatus.findFirstOrThrow({
    where: {
      checklistItemId,
      sessionId,
    },
  });
}

export async function isChecklistStatusCompleted(
  sessionId: string,
  checklistItemId: string,
  tx: Prisma.TransactionClient = db,
) {
  const checklistStatus = await getChecklistStatus(
    sessionId,
    checklistItemId,
    tx,
  );
  return checklistStatus.isCompleted;
}

export async function markCheckListStatus(
  id: string,
  isCompleted: boolean,
  tx: Prisma.TransactionClient = db,
): Promise<ChecklistStatusProps> {
  return tx.checklistStatus.update({
    where: { id },
    data: { isCompleted },
  });
}

export async function updateChecklistStatus(
  sessionId: string,
  checklistItemKey: ChecklistItemKeysOptions,
  isCompleted: boolean,
  tx: Prisma.TransactionClient = db,
) {
  const checklistItem = await getChecklistItem(checklistItemKey);
  const checklistStatus = await getChecklistStatus(sessionId, checklistItem.id);
  const updatedChecklistStatus = await tx.checklistStatus.update({
    where: {
      id: checklistStatus.id,
    },
    data: {
      isCompleted,
    },
  });
  return updatedChecklistStatus;
}

export async function getChecklistStatusBatch(
  sessionIds: string[],
  checklistItemId: string,
) {
  const checklistStatuses = await db.checklistStatus.findMany({
    where: {
      sessionId: {
        in: sessionIds,
      },
      checklistItemId,
    },
  });
  return checklistStatuses;
}

// updates checklist status for numerous users
export async function updateChecklistStatusBatch(
  sessionIds: string[],
  checklistItemKey: ChecklistItemKeysOptions,
  isCompleted: boolean,
  tx: Prisma.TransactionClient = db,
) {
  const checklistItem = await getChecklistItem(checklistItemKey);
  const checklistStatuses = await getChecklistStatusBatch(
    sessionIds,
    checklistItem.id,
  );
  const checklistStatusIds = checklistStatuses.map((status) => status.id);
  const updatedChecklistStatuses = await tx.checklistStatus.updateMany({
    where: {
      id: {
        in: checklistStatusIds,
      },
    },
    data: {
      isCompleted,
    },
  });
  return updatedChecklistStatuses;
}
