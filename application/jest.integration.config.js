/** @type {import('ts-jest').JestConfigWithTsJest} **/
export default {
  displayName: 'integration',
  testMatch: ['**/__tests__/**/integration/**/*.[jt]s?(x)'],
  testEnvironment: 'node',
  transform: {
    '^.+.tsx?$': ['ts-jest', {}],
  },
  maxWorkers: 1,
  setupFilesAfterEnv: ['<rootDir>/tests/setup.server.ts'],
  rootDir: '.',
  moduleNameMapper: {
    '^~/(.*)$': '<rootDir>/app/$1',
    '^@fixtures/(.*)$': '<rootDir>/prisma/fixtures/$1',
    '^@factories/(.*)$': '<rootDir>/prisma/factories/$1',
  },
};
