/** @type {import('ts-jest').JestConfigWithTsJest} **/
export default {
  displayName: "aws-integration",
  testMatch: ["**/__tests__/**/integration/**/*.[jt]s?(x)"],
  testPathIgnorePatterns: ["<rootDir>/.*setup.*"],
  testEnvironment: "node",
  transform: {
    "^.+.tsx?$": ["ts-jest", {}],
  },
  maxWorkers: 1,
  setupFilesAfterEnv: ["<rootDir>/../prisma/setup.server.ts"],
  rootDir: ".",
  moduleNameMapper: {
    "^~/(.*)$": "<rootDir>/$1",
    "^@db/(.*)$": "<rootDir>/../prisma/$1",
    "^/opt/nodejs/(.*)$": "<rootDir>/util-layer/$1",
  },
  modulePathIgnorePatterns: [".aws-sam"],
};
