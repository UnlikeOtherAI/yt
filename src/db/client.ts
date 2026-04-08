import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import type BetterSqlite3 from "better-sqlite3";

import { migrations } from "./migrations.js";

export type SqliteDatabase = BetterSqlite3.Database;

export const createDatabase = (databasePath: string): SqliteDatabase => {
  mkdirSync(dirname(databasePath), { recursive: true });
  const database = new Database(databasePath);
  database.pragma("foreign_keys = ON");

  for (const migration of migrations) {
    database.exec(migration);
  }

  return database;
};
