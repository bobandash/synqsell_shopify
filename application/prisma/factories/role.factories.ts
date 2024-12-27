import type { RolesOptions } from '~/constants';
import db from '~/db.server';
import { generateRoleData } from '@fixtures';
import { createTestSession } from './session.factories';

export const generateRole = async (
  sessionId: string,
  name: RolesOptions,
  isVisibleInNetwork: boolean = true,
  overrides = {},
) => {
  const data = generateRoleData(sessionId, name, isVisibleInNetwork);
  return db.role.create({
    data: {
      ...data,
      sessionId,
      ...overrides,
    },
  });
};

export const createTestRole = async (
  name: RolesOptions,
  isVisibleInNetwork: boolean = true,
  overrides = {},
) => {
  const session = await createTestSession();
  const role = await generateRole(
    session.id,
    name,
    isVisibleInNetwork,
    overrides,
  );
  return { session, role };
};
