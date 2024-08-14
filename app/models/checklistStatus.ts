import { errorHandler, getLogContext } from "~/util";
import db from "../db.server";
import { type Prisma } from "@prisma/client";
import { getChecklistItem } from "./checklistItem";

export type ChecklistStatusProps = {
  id: string;
  sessionId: string;
  isCompleted: boolean;
  checklistItemId: string;
};

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
    const context = getLogContext(
      getChecklistStatus,
      sessionId,
      checklistItemId,
    );
    throw errorHandler(error, context, "Failed to retrieve checklist status");
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
    const context = getLogContext(
      getChecklistStatusBatch,
      sessionIds,
      checklistItemId,
    );
    throw errorHandler(error, context, "Failed to retrieve checklist statuses");
  }
}

export async function isValidChecklistStatus(id: string) {
  try {
    const checklistStatus = await db.checklistStatus.findFirst({
      where: {
        id,
      },
    });
    if (checklistStatus) {
      return true;
    }
    return false;
  } catch (error) {
    const context = getLogContext(isValidChecklistStatus, id);
    throw errorHandler(
      error,
      context,
      "Failed to check if checklist status is valid",
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
    const context = getLogContext(markCheckListStatus, id, isCompleted);
    throw errorHandler(
      error,
      context,
      "Failed to mark checklist item as complete.",
    );
  }
}

export async function updateChecklistStatusTx(
  tx: Prisma.TransactionClient,
  sessionId: string,
  checklistItemKey: string,
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
    const context = getLogContext(
      updateChecklistStatusTx,
      tx,
      sessionId,
      checklistItemKey,
      isCompleted,
    );
    throw errorHandler(
      error,
      context,
      "Failed to update checklist status in batch.",
    );
  }
}

export async function updateChecklistStatusBatchTx(
  tx: Prisma.TransactionClient,
  sessionIds: string[],
  checklistItemKey: string,
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
    const context = getLogContext(
      updateChecklistStatusBatchTx,
      tx,
      sessionIds,
      checklistItemKey,
      isCompleted,
    );
    throw errorHandler(
      error,
      context,
      "Failed to update checklist status in batch.",
    );
  }
}
