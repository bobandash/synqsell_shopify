import db from '../../db.server';
import { errorHandler } from '~/lib/utils/server';
import { getUserPreferences } from './userPreferences';

export async function hasChecklistTable(id: string): Promise<boolean> {
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
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to check if check list table exists.',
      hasChecklistTable,
      { id },
    );
  }
}

export async function createMissingChecklistStatuses(
  missingChecklistIds: string[],
  sessionId: string,
) {
  const missingStatusData = missingChecklistIds.map((id) => ({
    sessionId: sessionId,
    checklistItemId: id,
    isCompleted: false,
  }));

  try {
    const missingChecklistStatuses = await db.checklistStatus.createMany({
      data: missingStatusData,
    });
    return missingChecklistStatuses;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to create missing checklist statuses.',
      createMissingChecklistStatuses,
      { missingChecklistIds, sessionId },
    );
  }
}

export async function getMissingChecklistIds(
  sessionId: string,
): Promise<string[]> {
  try {
    const currentChecklistItems = await db.checklistStatus.findMany({
      where: {
        sessionId: sessionId,
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
    throw errorHandler(
      error,
      'Failed to retrieve missing check list ids',
      getMissingChecklistIds,
      { sessionId },
    );
  }
}

export async function getTablesAndStatuses(sessionId: string) {
  try {
    const userPreferences = await getUserPreferences(sessionId);
    const { tableIdsHidden } = userPreferences;
    const tables = await db.checklistTable.findMany({
      orderBy: {
        position: 'asc',
      },
      include: {
        checklistItems: {
          orderBy: {
            position: 'asc',
          },
          include: {
            checklistStatuses: {
              where: {
                sessionId: sessionId,
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
        ({ checklistStatuses }) => {
          return (
            checklistStatuses.length > 0 && !checklistStatuses[0].isCompleted
          );
        },
      );
      activeIndex = activeIndex === -1 ? 0 : activeIndex;

      // check whether or not the table is hidden in user preferences
      const isHidden = tableIdsHidden.includes(table.id);

      return {
        ...table,
        isHidden: isHidden,
        checklistItems: table.checklistItems.map(
          ({ checklistStatuses, buttonText, ...item }, index) => {
            const isCompleted =
              checklistStatuses.length > 0
                ? checklistStatuses[0].isCompleted
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
    throw errorHandler(
      error,
      'Failed to get tables with checklist status.',
      getTablesAndStatuses,
      { sessionId },
    );
  }
}
