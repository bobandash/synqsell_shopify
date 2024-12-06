/** @type {import('ts-jest').JestConfigWithTsJest} **/
export default {
  displayName: 'unit',
  testMatch: ['**/__tests__/**/unit/**/*.[jt]s?(x)'],
  testEnvironment: 'node',
  transform: {
    '^.+.tsx?$': ['ts-jest', {}],
  },
  maxWorkers: 4,
  moduleNameMapper: {
    '^~/(.*)$': '<rootDir>/app/$1',
  },
};
