/** @type {import('ts-jest').JestConfigWithTsJest} **/
export default {
  displayName: 'integration',
  testMatch: ['**/__tests__/**/integration/**/*.[jt]s?(x)'],
  testEnvironment: './test-environment.ts',
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons'],
  },
  transform: {
    '^.+.tsx?$': ['ts-jest', {}],
  },
  maxWorkers: 1, // may be able to increase the number of
  setupFilesAfterEnv: ['<rootDir>/tests/setup.server.ts'],
  rootDir: '.',
  moduleNameMapper: {
    '^~/(.*)$': '<rootDir>/app/$1',
    '^@fixtures/(.*)$': '<rootDir>/prisma/fixtures/$1',
    '^@factories/(.*)$': '<rootDir>/prisma/factories/$1',
  },
};
