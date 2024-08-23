import db from "~/db.server";
import { errorHandler, getLogContext } from "~/util";

export async function hasChecklistItem(id: string) {
  try {
    const checklistItem = await db.checklistItem.findFirst({
      where: {
        id,
      },
    });
    if (!checklistItem) {
      return false;
    }
    return true;
  } catch (error) {
    const context = getLogContext(getChecklistItem, id);
    throw errorHandler(
      error,
      context,
      "Failed to retrieve tables and statuses",
    );
  }
}

export async function getChecklistItem(id: string) {
  try {
    const checklistItem = await db.checklistItem.findFirstOrThrow({
      where: {
        id,
      },
    });
    return checklistItem;
  } catch (error) {
    const context = getLogContext(getChecklistItem, id);
    throw errorHandler(
      error,
      context,
      "Failed to retrieve tables and statuses",
    );
  }
}
