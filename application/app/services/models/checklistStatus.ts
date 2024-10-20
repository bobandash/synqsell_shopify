import db from '../../db.server';
import { type Prisma } from '@prisma/client';
import { getChecklistItem } from './checklistItem';
import { errorHandler } from '../util';
import type { ChecklistItemKeysOptionsProps } from '~/constants';

export type ChecklistStatusProps = {
  id: string;
  sessionId: string;
  isCompleted: boolean;
  checklistItemId: string;
};

export async function isValidChecklistStatusId(checklistStatusId: string) {
  try {
    const checklistStatus = await db.checklistStatus.findFirst({
      where: {
        id: checklistStatusId,
      },
    });
    if (checklistStatus) {
      return true;
    }
    return false;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to check if checklist status is valid.',
      isValidChecklistStatusId,
      { checklistStatusId },
    );
  }
}

export async function hasChecklistStatus(
  sessionId: string,
  checklistItemId: string,
) {
  try {
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
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to retrieve checklist status.',
      hasChecklistStatus,
      { sessionId, checklistItemId },
    );
  }
}

export async function getChecklistStatus(
  sessionId: string,
  checklistItemId: string,
) {
  try {
    const checklistStatus = await db.checklistStatus.findFirstOrThrow({
      where: {
        checklistItemId,
        sessionId,
      },
    });
    return checklistStatus;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to retrieve checklist status.',
      getChecklistStatus,
      { sessionId, checklistItemId },
    );
  }
}

export async function isChecklistStatusCompleted(
  sessionId: string,
  checklistItemId: string,
) {
  try {
    const checklistStatus = await getChecklistStatus(
      sessionId,
      checklistItemId,
    );
    if (checklistStatus.isCompleted) {
      return true;
    }
    return false;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to check if checklist status is completed.',
      isChecklistStatusCompleted,
      { sessionId, checklistItemId },
    );
  }
}

export async function markCheckListStatus(
  id: string,
  isCompleted: boolean,
): Promise<ChecklistStatusProps> {
  try {
    const data = await db.checklistStatus.update({
      where: {
        id,
      },
      data: {
        isCompleted: isCompleted,
      },
    });
    return data;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to mark checklist status as completed.',
      markCheckListStatus,
      { id, isCompleted },
    );
  }
}

export async function updateChecklistStatusTx(
  tx: Prisma.TransactionClient,
  sessionId: string,
  checklistItemKey: ChecklistItemKeysOptionsProps,
  isCompleted: boolean,
) {
  try {
    const checklistItem = await getChecklistItem(checklistItemKey);
    const checklistStatus = await getChecklistStatus(
      sessionId,
      checklistItem.id,
    );
    const updatedChecklistStatus = await tx.checklistStatus.update({
      where: {
        id: checklistStatus.id,
      },
      data: {
        isCompleted,
      },
    });
    return updatedChecklistStatus;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to update checklist status in transaction.',
      updateChecklistStatusTx,
      { sessionId, checklistItemKey, isCompleted },
    );
  }
}

export async function getChecklistStatusBatch(
  sessionIds: string[],
  checklistItemId: string,
) {
  try {
    const checklistStatuses = await db.checklistStatus.findMany({
      where: {
        sessionId: {
          in: sessionIds,
        },
        checklistItemId,
      },
    });
    return checklistStatuses;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to get checklist statuses for many users.',
      getChecklistStatusBatch,
      { sessionIds, checklistItemId },
    );
  }
}

// updates checklist status for numerous users
export async function updateChecklistStatusBatchTx(
  tx: Prisma.TransactionClient,
  sessionIds: string[],
  checklistItemKey: ChecklistItemKeysOptionsProps,
  isCompleted: boolean,
) {
  try {
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
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to update checklist statuses in transaction.',
      updateChecklistStatusBatchTx,
      { sessionIds, checklistItemKey, isCompleted },
    );
  }
}
