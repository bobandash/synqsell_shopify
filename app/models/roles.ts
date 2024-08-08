import db from "../db.server";
import createHttpError from "http-errors";
import logger from "logger";
import { ROLES } from "~/constants";
import {
  convertObjectValuesToArr,
  errorHandler,
  getLogCombinedMessage,
  getLogContext,
} from "~/util";

export type RoleProps = {
  id: string;
  name: string;
  sessionId: string;
};

export async function getRoles(sessionId: string) {
  try {
    const data = await db.role.findMany({
      where: {
        sessionId,
      },
    });
    const roles = data.map(({ name }) => name);
    return roles;
  } catch (error) {
    const context = getLogContext(getRoles, sessionId);
    throw errorHandler(
      error,
      context,
      "Failed to get roles in database. Please try again later.",
    );
  }
}

export async function hasRole(sessionId: string, role: string) {
  try {
    const result = await db.role.findFirst({
      where: {
        sessionId: sessionId,
        name: role,
      },
    });

    if (result) {
      return true;
    }
    return false;
  } catch (error) {
    const context = getLogContext(hasRole, sessionId, role);
    throw errorHandler(
      error,
      context,
      "Failed to check if user has roles in database. Please try again later.",
    );
  }
}

async function validateAddRole(sessionId: string, role: string) {
  const validRoles = new Set(convertObjectValuesToArr(ROLES));
  if (!validRoles.has(role)) {
    const logMessage = getLogCombinedMessage(
      validateAddRole,
      `Role ${role} is invalid.`,
      sessionId,
      role,
    );
    logger.error(logMessage);
    throw new createHttpError.BadRequest(
      `Role not valid. Please contact support.`,
    );
  }

  try {
    if (await hasRole(sessionId, role)) {
      const logMessage = getLogCombinedMessage(
        validateAddRole,
        `Role ${role} already exists for user.`,
        sessionId,
        role,
      );
      logger.error(logMessage);
      throw new createHttpError.BadRequest(
        `${role} already exists for user. Please contact support.`,
      );
    }
  } catch (error) {
    const context = getLogContext(validateAddRole, sessionId, role);
    throw errorHandler(
      error,
      context,
      "Failed to validate if user roles were valid. Please try again later.",
    );
  }
}

export async function addRole(sessionId: string, role: string) {
  try {
    await validateAddRole(sessionId, role);
    const newRole = await db.role.create({
      data: {
        sessionId,
        name: role,
      },
    });
    return newRole;
  } catch (error) {
    const context = getLogContext(addRole, sessionId, role);
    throw errorHandler(
      error,
      context,
      "Failed to add role. Please try again later",
    );
  }
}

export async function deleteRole(id: string) {
  try {
    const newRole = await db.role.delete({
      where: {
        id,
      },
    });
    return newRole;
  } catch (error) {
    const context = getLogContext(deleteRole, id);
    throw errorHandler(
      error,
      context,
      "Failed to delete role in database. Please try again later.",
    );
  }
}

export async function getRole(sessionId: string, role: string) {
  try {
    const currentRole = db.role.findFirst({
      where: {
        sessionId: sessionId,
        name: role,
      },
    });
    return currentRole;
  } catch (error) {
    const context = getLogContext(getRole, sessionId, role);
    throw errorHandler(
      error,
      context,
      "Failed to get role. Please try again later",
    );
  }
}
