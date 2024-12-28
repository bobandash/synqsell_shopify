/** @type {import('ts-jest').JestConfigWithTsJest} **/
export default {
  moduleFileExtensions: ["js", "jsx", "ts", "tsx", "json", "node"],
  rootDir: ".",
  projects: [
    "<rootDir>/application/jest.unit.config.js",
    "<rootDir>/application/jest.integration.config.js",
    "<rootDir>/aws/jest.unit.config.js",
  ],
};
