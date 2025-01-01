import type { RolesOptions } from "@db/constants";
import db from "@db/test-db";
import { generateRoleData } from "@db/fixtures";
import { createTestSession } from "@db/factories/session.factories";
import { Prisma, Role, Session } from "@prisma/client";
import { PrismaClient } from "@prisma/client/extension";
type DbClient = PrismaClient | Prisma.TransactionClient;

export type TestRole = {
  session: Session;
  role: Role;
};

export const generateRole = async (
  sessionId: string,
  name: RolesOptions,
  isVisibleInNetwork: boolean = true,
  overrides = {},
  ctx: DbClient = db
) => {
  const data = generateRoleData(sessionId, name, isVisibleInNetwork);
  return await ctx.role.create({
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
