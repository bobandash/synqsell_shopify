import type { RolesOptions } from "@db/constants";
import db from "@db/test-db";
import { generateRoleData } from "@db/fixtures";
import { createTestSession } from "@db/factories/session.factories";
import { Role, Session } from "@prisma/client";

export type TestRole = {
  session: Session;
  role: Role;
};

export const generateRole = async (
  sessionId: string,
  name: RolesOptions,
  isVisibleInNetwork: boolean = true,
  overrides = {}
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
  overrides = {}
): Promise<TestRole> => {
  const session = await createTestSession();
  const role = await generateRole(
    session.id,
    name,
    isVisibleInNetwork,
    overrides
  );
  return { session, role };
};
