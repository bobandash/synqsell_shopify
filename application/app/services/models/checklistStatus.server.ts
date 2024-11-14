import db from '../../db.server';
import { type Prisma } from '@prisma/client';
import { getChecklistItem } from './checklistItem.server';
import type { ChecklistItemKeysOptions } from '~/constants';

export type ChecklistStatusProps = {
  id: string;
  sessionId: string;
  isCompleted: boolean;
  checklistItemId: string;
};

export async function isValidChecklistStatusId(checklistStatusId: string) {
  const checklistStatus = await db.checklistStatus.findFirst({
    where: {
      id: checklistStatusId,
    },
  });
  if (checklistStatus) {
    return true;
  }
  return false;
}

export async function hasChecklistStatus(
  sessionId: string,
  checklistItemId: string,
) {
  const checklistStatus = await db.checklistStatus.findFirst({
    where: {
      checklistItemId,
      sessionId,
    },
  });
  if (!checklistStatus) {
    return false;
  }
  return true;
}

export async function getChecklistStatus(
  sessionId: string,
  checklistItemId: string,
) {
  const checklistStatus = await db.checklistStatus.findFirstOrThrow({
    where: {
      checklistItemId,
      sessionId,
    },
  });
  return checklistStatus;
}

export async function isChecklistStatusCompleted(
  sessionId: string,
  checklistItemId: string,
) {
  const checklistStatus = await getChecklistStatus(sessionId, checklistItemId);
  if (checklistStatus.isCompleted) {
    return true;
  }
  return false;
}

export async function markCheckListStatus(
  id: string,
  isCompleted: boolean,
): Promise<ChecklistStatusProps> {
  const data = await db.checklistStatus.update({
    where: {
      id,
    },
    data: {
      isCompleted: isCompleted,
    },
  });
  return data;
}

export async function updateChecklistStatus(
  sessionId: string,
  checklistItemKey: ChecklistItemKeysOptions,
  isCompleted: boolean,
) {
  const checklistItem = await getChecklistItem(checklistItemKey);
  const checklistStatus = await getChecklistStatus(sessionId, checklistItem.id);
  const updatedChecklistStatus = await db.checklistStatus.update({
    where: {
      id: checklistStatus.id,
    },
    data: {
      isCompleted,
    },
  });
  return updatedChecklistStatus;
}

export async function updateChecklistStatusTx(
  tx: Prisma.TransactionClient,
  sessionId: string,
  checklistItemKey: ChecklistItemKeysOptions,
  isCompleted: boolean,
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
export async function updateChecklistStatusBatchTx(
  tx: Prisma.TransactionClient,
  sessionIds: string[],
  checklistItemKey: ChecklistItemKeysOptions,
  isCompleted: boolean,
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
