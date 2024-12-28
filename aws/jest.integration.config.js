/** @type {import('ts-jest').JestConfigWithTsJest} **/
export default {
  displayName: "integration",
  testMatch: ["**/__tests__/**/integration/**/*.[jt]s?(x)"],
  testEnvironment: "node",
  transform: {
    "^.+.tsx?$": ["ts-jest", {}],
  },
  maxWorkers: 1,
  setupFilesAfterEnv: ["<rootDir>/../prisma/setup.server.ts"],
  rootDir: ".",
  modulePathIgnorePatterns: [".aws-sam"],
  moduleNameMapper: {
    "^~/(.*)$": "<rootDir>/app/$1",
    "^@fixtures(/.*)?$": "<rootDir>/../prisma/fixtures.ts",
    "^@db/factories/(.*)$": "<rootDir>/../prisma/factories/$1",
  },
};
