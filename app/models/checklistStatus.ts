import { errorHandler, getLogCombinedMessage, getLogContext } from "~/util";
import db from "../db.server";
import createHttpError from "http-errors";
import logger from "logger";

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
