import type { Prisma } from '@prisma/client';
import type { RolesOptions } from '~/constants';
import db from '~/db.server';

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

export async function getRoles(sessionId: string) {
  const roles = await db.role.findMany({
    where: {
      sessionId,
    },
  });
  return roles;
}

export async function hasRole(sessionId: string, role: string) {
  const res = await db.role.findFirst({
    where: {
      sessionId: sessionId,
      name: role,
    },
  });

  return res !== null;
}

export async function getRole(sessionId: string, role: string) {
  const currentRole = await db.role.findFirstOrThrow({
    where: {
      sessionId: sessionId,
      name: role,
    },
  });
  return currentRole;
}

export async function getRoleBatch(sessionIds: string[], role: RolesOptions) {
  const roles = await db.role.findMany({
    where: {
      sessionId: { in: sessionIds },
      name: role,
    },
  });
  return roles;
}

export async function addRole(sessionId: string, role: RolesOptions) {
  const newRole = await db.role.create({
    data: {
      sessionId,
      name: role,
    },
  });
  return newRole;
}

export async function deleteRole(id: string) {
  const deletedRole = await db.role.delete({
    where: {
      id,
    },
  });
  return deletedRole;
}

// should not update if role doesn't exist
export async function updateRoleVisibilityTx(
  tx: Prisma.TransactionClient,
  sessionId: string,
  role: RolesOptions,
  isVisibleInNetwork: boolean,
) {
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
}
