import db from "~/db.server";
import { errorHandler, getLogContext } from "~/util";

export async function getChecklistItem(key: string) {
  try {
    const checklistItem = await db.checklistItem.findFirstOrThrow({
      where: {
        key,
      },
    });
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
