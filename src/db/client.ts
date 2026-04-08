import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";

import { migrations } from "./migrations.js";

export const createDatabase = (databasePath: string) => {
  mkdirSync(dirname(databasePath), { recursive: true });
  const database = new Database(databasePath);
  database.pragma("foreign_keys = ON");

  for (const migration of migrations) {
    database.exec(migration);
  }

  return database;
};

export type SqliteDatabase = ReturnType<typeof createDatabase>;
