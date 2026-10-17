/** Unit + integration in one run so CI publishes a single combined coverage report. */
const unit = require("./jest.config.cjs");
const integration = require("./jest.integration.config.cjs");

module.exports = {
  collectCoverageFrom: unit.collectCoverageFrom,
  coverageDirectory: "coverage/all",
  coverageReporters: ["text-summary", "lcov", "json-summary"],
  projects: [
    { ...unit, displayName: "unit", collectCoverageFrom: undefined, coverageDirectory: undefined, coverageReporters: undefined, forceExit: undefined },
    {
      ...integration,
      displayName: "integration",
      collectCoverageFrom: undefined,
      coverageDirectory: undefined,
      coverageReporters: undefined,
      forceExit: undefined,
    },
  ],
};
