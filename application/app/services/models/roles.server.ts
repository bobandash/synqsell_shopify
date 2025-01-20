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
export async function getRoles(
  sessionId: string,
  tx: Prisma.TransactionClient = db,
) {
  return tx.role.findMany({
    where: { sessionId },
  });
}

export async function hasRole(
  sessionId: string,
  role: string,
  tx: Prisma.TransactionClient = db,
) {
  const count = await tx.role.count({
    where: { sessionId, name: role },
  });
  return count > 0;
}

export async function getRole(
  sessionId: string,
  role: string,
  tx: Prisma.TransactionClient = db,
) {
  return tx.role.findFirstOrThrow({
    where: { sessionId, name: role },
  });
}

export async function getRoleBatch(
  sessionIds: string[],
  role: RolesOptions,
  tx: Prisma.TransactionClient = db,
) {
  return tx.role.findMany({
    where: {
      sessionId: { in: sessionIds },
      name: role,
    },
  });
}

export async function addRole(
  sessionId: string,
  role: RolesOptions,
  tx: Prisma.TransactionClient = db,
) {
  return tx.role.create({
    data: {
      sessionId,
      name: role,
    },
  });
}

export async function deleteRole(
  id: string,
  tx: Prisma.TransactionClient = db,
) {
  return tx.role.delete({
    where: { id },
  });
}

export async function updateRoleVisibility(
  sessionId: string,
  role: RolesOptions,
  isVisibleInNetwork: boolean,
  tx: Prisma.TransactionClient = db,
) {
  const currentRole = await getRole(sessionId, role, tx);
  return tx.role.update({
    where: { id: currentRole.id },
    data: { isVisibleInNetwork },
  });
}
