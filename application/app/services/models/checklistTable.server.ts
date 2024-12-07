import db from '~/db.server';
import { getUserPreferences } from './userPreferences.server';

export async function hasChecklistTable(id: string): Promise<boolean> {
  const checklistTable = await db.checklistTable.findFirst({
    where: {
      id: id,
    },
  });

  return checklistTable !== null;
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
  const missingChecklistStatuses = await db.checklistStatus.createMany({
    data: missingStatusData,
  });
  return missingChecklistStatuses;
}

export async function getMissingChecklistIds(
  sessionId: string,
): Promise<string[]> {
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
}

export async function getTablesAndStatuses(sessionId: string) {
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
      ({ checklistStatuses }) =>
        checklistStatuses.length > 0 && !checklistStatuses[0].isCompleted,
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
}
