import db from "../db.server";
import { getUserPreferences } from "./userPreferences";
import type { TransformedChecklistTableData } from "./types";
import * as createHttpError from "http-errors";
async function hasChecklistTable(id: string): Promise<boolean> {
  try {
    const table = await db.checklistTable.findFirst({
      where: {
        id: id,
      },
    });
    if (!table) {
      return false;
    }
    return true;
  } catch {
    throw new createHttpError.InternalServerError(
      "Failed to retrieve checklist table.",
    );
  }
}

async function createMissingChecklistStatuses(
  missingChecklistIds: string[],
  shop: string,
): Promise<undefined> {
  const missingStatusData = missingChecklistIds.map((id) => ({
    shop: shop,
    checklistItemId: id,
    isCompleted: false,
  }));

  try {
    await db.checklistStatus.createMany({
      data: missingStatusData,
    });
    return;
  } catch (error) {
    throw new createHttpError.InternalServerError(
      "Failed to create missing checklist statuses",
    );
  }
}

async function getMissingChecklistIds(shop: string): Promise<string[]> {
  try {
    const currentChecklistItems = await db.checklistStatus.findMany({
      where: {
        shop: shop,
      },
      select: {
        checklistItemId: true,
      },
    });

    const allChecklistItems = await db.checklistItem.findMany({
      select: {
        id: true,
      },
    });

    const currentChecklistItemsIds = new Set(
      currentChecklistItems.map((item) => item.checklistItemId),
    );
    const allChecklistItemIds = allChecklistItems.map((item) => item.id);
    const missingChecklistIds = allChecklistItemIds.filter(
      (id) => !currentChecklistItemsIds.has(id),
    );
    return missingChecklistIds;
  } catch (error) {
    throw new createHttpError.InternalServerError(
      "Failed to get missing check list ids",
    );
  }
}

async function getTablesAndStatuses(
  shop: string,
): Promise<TransformedChecklistTableData[]> {
  try {
    const userPreferences = await getUserPreferences(shop);
    const { tableIdsHidden } = userPreferences;
    const tables = await db.checklistTable.findMany({
      orderBy: {
        position: "asc",
      },
      include: {
        checklistItems: {
          orderBy: {
            position: "asc",
          },
          include: {
            checklistStatus: {
              where: {
                shop: shop,
              },
              select: {
                isCompleted: true,
              },
            },
          },
        },
      },
    });

    // Get the tables to the necessary format
    const transformedTables = tables.map((table) => {
      // activeIndex for which checklist item to display
      let activeIndex = table.checklistItems.findIndex(
        ({ checklistStatus }) => {
          return checklistStatus.length > 0 && !checklistStatus[0].isCompleted;
        },
      );
      activeIndex = activeIndex === -1 ? 0 : activeIndex;

      // check whether or not the table is hidden in user preferences
      const isHidden = tableIdsHidden.includes(table.id);

      return {
        ...table,
        isHidden: isHidden,
        checklistItems: table.checklistItems.map(
          ({ checklistStatus, buttonText, ...item }, index) => {
            const isCompleted =
              checklistStatus.length > 0
                ? checklistStatus[0].isCompleted
                : false;
            const isActive = activeIndex === index;
            return {
              ...item,
              isCompleted,
              ...(buttonText !== null && {
                button: {
                  content: buttonText,
                  action: null,
                },
              }),
              isActive,
            };
          },
        ),
      };
    });
    return transformedTables;
  } catch (error) {
    throw new createHttpError.InternalServerError(
      "Failed to retrieve tables and statuses",
    );
  }
}

export {
  createMissingChecklistStatuses,
  getMissingChecklistIds,
  getTablesAndStatuses,
  hasChecklistTable,
};
