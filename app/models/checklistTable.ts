import db from "../db.server";
async function createMissingChecklistStatuses(
  missingChecklistIds: string[],
  shop: string,
) {
  const missingStatusData = missingChecklistIds.map((id) => ({
    shop: shop,
    checklistItemId: id,
    isCompleted: false,
  }));

  const checklistStatus = await db.checklistStatus.createMany({
    data: missingStatusData,
  });

  return checklistStatus;
}
