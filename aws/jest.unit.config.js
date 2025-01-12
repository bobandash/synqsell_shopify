/** @type {import('ts-jest').JestConfigWithTsJest} **/
export default {
  displayName: "aws-unit",
  testMatch: ["**/__tests__/unit/**/*.[jt]s?(x)"],
  testEnvironment: "node",
  modulePathIgnorePatterns: [".aws-sam"],
  transform: {
    "^.+.tsx?$": ["ts-jest", {}],
  },
  moduleNameMapper: {
    "^/opt/nodejs/(.*)$": "<rootDir>/util-layer/$1",
  },
  maxWorkers: 4,
};
