import type { Prisma } from '@prisma/client';
import db from '../../db.server';
import { ROLES } from '~/constants';
import { convertObjectValuesToArr } from '~/lib/utils';
import { errorHandler } from '~/lib/utils/server';

interface SharedRoleProps {
  id: string;
  name: string;
  sessionId: string;
  isVisibleInNetwork: boolean;
}

export interface RoleProps extends SharedRoleProps {
  createdAt: Date;
}

export interface RolePropsJSON extends SharedRoleProps {
  createdAt: string;
}

export async function isValidRole(role: string) {
  const validRoles = new Set(convertObjectValuesToArr(ROLES));
  if (!validRoles.has(role)) {
    return false;
  }
  return true;
}

export async function getRoles(sessionId: string) {
  try {
    const roles = await db.role.findMany({
      where: {
        sessionId,
      },
    });
    return roles;
  } catch (error) {
    throw errorHandler(error, 'Failed to get all rules for user.', getRoles, {
      sessionId,
    });
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
    throw errorHandler(
      error,
      'Failed to check if role exists for user.',
      hasRole,
      {
        sessionId,
        role,
      },
    );
  }
}

export async function getRole(sessionId: string, role: string) {
  try {
    const currentRole = await db.role.findFirstOrThrow({
      where: {
        sessionId: sessionId,
        name: role,
      },
    });
    return currentRole;
  } catch (error) {
    throw errorHandler(error, 'Failed to retrieve role.', getRole, {
      sessionId,
      role,
    });
  }
}

export async function getRoleBatch(sessionIds: string[], role: string) {
  try {
    const roles = await db.role.findMany({
      where: {
        sessionId: { in: sessionIds },
        name: role,
      },
    });
    return roles;
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to retrieve roles in batch.',
      getRoleBatch,
      {
        sessionIds,
        role,
      },
    );
  }
}

export async function addRole(sessionId: string, role: string) {
  try {
    const newRole = await db.role.create({
      data: {
        sessionId,
        name: role,
      },
    });
    return newRole;
  } catch (error) {
    throw errorHandler(error, 'Failed to add role.', addRole, {
      sessionId,
      role,
    });
  }
}

export async function deleteRole(id: string) {
  try {
    const deletedRole = await db.role.delete({
      where: {
        id,
      },
    });
    return deletedRole;
  } catch (error) {
    throw errorHandler(error, 'Failed to delete role.', deleteRole, { id });
  }
}

// should not update if role doesn't exist
export async function updateRoleVisibilityTx(
  tx: Prisma.TransactionClient,
  sessionId: string,
  role: string,
  isVisibleInNetwork: boolean,
) {
  try {
    const currentRole = await getRole(sessionId, role);
    const { id } = currentRole;
    await tx.role.update({
      where: {
        id,
      },
      data: {
        isVisibleInNetwork,
      },
    });
  } catch (error) {
    throw errorHandler(
      error,
      'Failed to update role in transaction.',
      updateRoleVisibilityTx,
      { sessionId, role, isVisibleInNetwork },
    );
  }
}
