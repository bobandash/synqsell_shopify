import createHttpError from "http-errors";
import logger from "logger";
import db from "~/db.server";
import { errorHandler, getLogCombinedMessage, getLogContext } from "~/util";

export async function getChecklistItem(key: string) {
  try {
    const checklistItem = await db.checklistItem.findFirst({
      where: {
        key,
      },
    });
    if (!checklistItem) {
      const logMessage = getLogCombinedMessage(
        getChecklistItem,
        `Checklist item does not exist.`,
        key,
      );
      logger.error(logMessage);
      throw new createHttpError.BadRequest(
        `Checklist item does not exist. Please contact support.`,
      );
    }
    return checklistItem;
  } catch (error) {
    const context = getLogContext(getChecklistItem, key);
    throw errorHandler(
      error,
      context,
      "Failed to retrieve tables and statuses",
    );
  }
}
