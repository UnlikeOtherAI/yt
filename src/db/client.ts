import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { migrations } from "./migrations.js";

export type SqliteDatabase = DatabaseSync;

export const createDatabase = (databasePath: string): SqliteDatabase => {
  mkdirSync(dirname(databasePath), { recursive: true });
  const database = new DatabaseSync(databasePath);
  database.exec("PRAGMA foreign_keys = ON");

  for (const migration of migrations) {
    database.exec(migration);
  }

  return database;
};
