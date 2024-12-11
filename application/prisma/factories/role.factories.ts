import type { RolesOptions } from '~/constants';
import db from '~/db.server';
import { sampleRole } from '@fixtures/role.fixture';

export const createSampleRole = async (
  sessionId: string,
  name: RolesOptions,
  isVisibleInNetwork: boolean = true,
  overrides = {},
) => {
  return db.role.create({
    data: {
      ...sampleRole(sessionId, name, isVisibleInNetwork),
      ...overrides,
    },
  });
};
