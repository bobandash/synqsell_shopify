import db from "../db.server";
import createHttpError from "http-errors";

export type ChecklistStatusProps = {
  id: string;
  shop: string;
  isCompleted: boolean;
  checklistItemId: string;
};

export async function getChecklistStatus(
  shop: string,
  checklistItemId: string,
) {
  try {
    const checklistStatus = await db.checklistStatus.findFirst({
      where: {
        checklistItemId,
        shop,
      },
    });
    if (!checklistStatus) {
      throw new createHttpError.BadRequest(
        `getChecklistStatus (shop: ${shop}, checklistItemId: ${checklistItemId}) does not exist.`,
      );
    }
    return checklistStatus;
  } catch (error) {
    throw new createHttpError.InternalServerError(
      `getChecklistStatus (shop: ${shop}, checklistItemId: ${checklistItemId}) had a failed retrieval..`,
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
    throw new createHttpError.InternalServerError(
      `markCheckListStatusCompleted (id: ${id} failed to update to completed`,
    );
  }
}
