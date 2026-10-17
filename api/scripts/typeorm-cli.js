/**
 * Runs the TypeORM CLI against the TypeScript sources with `@/` path aliases resolved,
 * wherever pnpm hoisted typeorm to. Usage: node scripts/typeorm-cli.js migration:run -d src/config/data-source.ts
 */
const path = require("path");

process.env.TS_NODE_PROJECT = path.join(__dirname, "..", "tsconfig.json");
require("ts-node/register");
require("tsconfig-paths/register");

process.argv = [process.argv[0], require.resolve("typeorm/cli.js"), ...process.argv.slice(2)];
require("typeorm/cli.js");
