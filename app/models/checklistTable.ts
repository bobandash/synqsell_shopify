import db from "../db.server";
import logger from "logger";

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
    return tables;
  } catch (error) {
    logger.error(error);
    throw new Error("failed to get tables and statuses");
  }
}

export {
  createMissingChecklistStatuses,
  getMissingChecklistIds,
  getTablesAndStatuses,
};
