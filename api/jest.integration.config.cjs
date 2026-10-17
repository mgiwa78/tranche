/** Integration tests: real Postgres + Redis, Nest app driven through Supertest. */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/test/integration"],
  testMatch: ["**/*.int.ts"],
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
  setupFiles: ["<rootDir>/test/integration/env.ts"],
  testTimeout: 30000,
  maxWorkers: 1,
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.spec.ts",
    "!src/main.ts",
    "!src/database/migrations/**",
    "!src/database/seeders/**",
    "!src/**/index.ts",
  ],
  coverageDirectory: "coverage/integration",
  coverageReporters: ["text-summary", "lcov", "json-summary"],
  forceExit: true,
};
