// Turns a Jest json-summary into a Markdown table for the GitHub job summary.
// Usage: node infra/scripts/coverage-summary.js api/coverage/all/coverage-summary.json
const fs = require("fs");

const file = process.argv[2];
if (!file || !fs.existsSync(file)) {
  console.log("### Coverage\n\nNo coverage summary was produced.");
  process.exit(0);
}

const total = JSON.parse(fs.readFileSync(file, "utf8")).total;
const rows = ["lines", "statements", "functions", "branches"].map(
  (key) => `| ${key} | ${total[key].pct}% | ${total[key].covered}/${total[key].total} |`,
);
console.log(["### API coverage", "", "| | % | covered |", "|---|---|---|", ...rows].join("\n"));
