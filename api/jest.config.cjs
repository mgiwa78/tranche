/** Unit tests: colocated `*.spec.ts`, no database or Redis. */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/*.spec.ts"],
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
  setupFiles: ["<rootDir>/test/unit-env.ts"],
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.spec.ts",
    "!src/main.ts",
    "!src/database/migrations/**",
    "!src/database/seeders/**",
    "!src/**/index.ts",
  ],
  coverageDirectory: "coverage/unit",
  coverageReporters: ["text-summary", "lcov", "json-summary"],
  forceExit: true,
};
