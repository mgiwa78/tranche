import "reflect-metadata";
import path from "path";
import { DataSource, DataSourceOptions } from "typeorm";
import { Config } from "./index";
import { ENTITIES } from "@/database/entities";

const runningCompiled = __filename.replace(/\\/g, "/").includes("/dist/");

const connection = Config.database.url
  ? { url: Config.database.url }
  : {
      host: Config.database.host,
      port: Config.database.port,
      username: Config.database.username,
      password: Config.database.password,
      database: Config.database.name,
    };

export const dataSourceOptions: DataSourceOptions = {
  type: "postgres",
  ...connection,
  synchronize: Config.database.synchronize,
  logging: false,
  ssl: Config.database.ssl ? { rejectUnauthorized: false } : false,
  extra: {
    connectionTimeoutMillis: 8000,
    max: 20,
    idleTimeoutMillis: 30000,
  },
  entities: ENTITIES,
  migrations: [
    runningCompiled
      ? path.join(__dirname, "..", "database", "migrations", "**", "*.js")
      : path.join(__dirname, "..", "database", "migrations", "**", "*.ts"),
  ],
  migrationsTransactionMode: "each",
  subscribers: [],
};

/** Used by the TypeORM CLI (migrations) and the seed runner. Nest builds its own from the same options. */
export const AppDataSource = new DataSource(dataSourceOptions);
