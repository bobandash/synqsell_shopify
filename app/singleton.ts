import { type PrismaClient } from "@prisma/client";
import { mockDeep, mockReset, type DeepMockProxy } from "jest-mock-extended";
import prisma from "./db.server";

// Creates a deep mock of the prisma db for integrations tests
jest.mock("./db.server", () => ({
  __esModule: true,
  default: mockDeep<PrismaClient>(),
}));

beforeEach(() => {
  mockReset(prismaMock);
});

afterAll(() => {
  jest.resetModules();
});

export const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;
