/** @type {import('ts-jest').JestConfigWithTsJest} **/
export default {
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json', 'node'],
  projects: [
    '<rootDir>/jest.unit.config.js',
    '<rootDir>/jest.integration.config.js',
  ],
};
