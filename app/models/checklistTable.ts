import db from "../db.server";
import logger from "logger";
import { getUserPreferences } from "./userPreferences";

async function hasChecklistTable(id: string): Promise<Boolean> {
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
    throw new Error("Failed to retrieve checklist table.");
  }
}

async function createMissingChecklistStatuses(
  missingChecklistIds: string[],
  shop: string,
) {
  const missingStatusData = missingChecklistIds.map((id) => ({
    shop: shop,
    checklistItemId: id,
    isCompleted: false,
  }));

  try {
    const checklistStatus = await db.checklistStatus.createMany({
      data: missingStatusData,
    });
    return checklistStatus;
  } catch (error) {
    logger.error(error);
    throw new Error("Failed to create missing checklist statuses");
  }
}

async function getMissingChecklistIds(shop: string) {
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
    logger.error(error);
    throw new Error("Failed to get missing check list ids");
  }
}

async function getTablesAndStatuses(shop: string) {
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
          ({ checklistStatus, ...item }, index) => {
            const isCompleted =
              checklistStatus.length > 0
                ? checklistStatus[0].isCompleted
                : false;
            const isActive = activeIndex === index;
            return {
              ...item,
              isCompleted,
              ...(item.buttonText !== null && {
                button: {
                  content: item.buttonText,
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
    logger.error(error);
    throw new Error("failed to get tables and statuses");
  }
}

export {
  createMissingChecklistStatuses,
  getMissingChecklistIds,
  getTablesAndStatuses,
  hasChecklistTable,
};
