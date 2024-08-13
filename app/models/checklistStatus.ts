import { errorHandler, getLogCombinedMessage, getLogContext } from "~/util";
import db from "../db.server";
import createHttpError from "http-errors";
import logger from "~/logger";
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
    const checklistStatus = await db.checklistStatus.findFirst({
      where: {
        checklistItemId,
        sessionId,
      },
    });
    if (!checklistStatus) {
      const logMessage = getLogCombinedMessage(
        getChecklistStatus,
        `Checklist item ${checklistItemId} does not exist.`,
        sessionId,
        checklistItemId,
      );
      logger.error(logMessage);
      throw new createHttpError.BadRequest(
        `Checklist item does not exist. Please contact support.`,
      );
    }
    return checklistStatus;
  } catch (error) {
    const context = getLogContext(
      getChecklistStatus,
      sessionId,
      checklistItemId,
    );
    throw errorHandler(
      error,
      context,
      "Failed to retrieve tables and statuses",
    );
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
      "Failed to mark checklist item as complete. Please try again later.",
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
      "Failed to update check list status. Please try again later.",
    );
  }
}
