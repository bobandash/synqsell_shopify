import db from "~/db.server";
import { errorHandler, getLogCombinedMessage, getLogContext } from "~/util";
import { isValidRole } from "../roles";
import logger from "logger";
import createHttpError from "http-errors";
import { isValidChecklistStatus } from "../checklistStatus";

function validateRole(role: string) {
  if (!isValidRole(role)) {
    const logMessage = getLogCombinedMessage(
      validateRole,
      `Role ${role} is invalid.`,
      role,
    );
    logger.error(logMessage);
    throw new createHttpError.BadRequest(
      `Role not valid. Please contact support.`,
    );
  }
}

async function validateChecklistStatus(checklistStatusId: string) {
  try {
    if (!isValidChecklistStatus(checklistStatusId)) {
      const logMessage = getLogCombinedMessage(
        validateChecklistStatus,
        `Checklist status is invalid.`,
        checklistStatusId,
      );
      logger.error(logMessage);
      throw new createHttpError.BadRequest(
        `Checklist status not valid. Please contact support.`,
      );
    }
  } catch (error) {
    const context = getLogContext(validateChecklistStatus, checklistStatusId);
    throw errorHandler(error, context, "Failed to validate checklist status");
  }
}

async function createRoleAndCompleteChecklistItem(
  sessionId: string,
  role: string,
  checklistStatusId: string,
) {
  try {
    validateRole(role);
    await validateChecklistStatus(checklistStatusId);
    const [newRole, newChecklistStatus] = await db.$transaction(async (tx) => {
      const newRole = await tx.role.create({
        data: {
          name: role,
          sessionId,
        },
      });
      const newChecklistStatus = await tx.checklistStatus.update({
        where: {
          id: checklistStatusId,
        },
        data: {
          isCompleted: true,
        },
      });
      return [newRole, newChecklistStatus];
    });

    return {
      role: newRole,
      checklistStatus: newChecklistStatus,
    };
  } catch (error) {
    const context = getLogContext(
      createRoleAndCompleteChecklistItem,
      sessionId,
      role,
      checklistStatusId,
    );
    throw errorHandler(
      error,
      context,
      "Failed to create role and complete checklist status.",
    );
  }
}

export default createRoleAndCompleteChecklistItem;
