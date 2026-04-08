import type { SqliteDatabase } from "./client.js";

export class SyncRunsRepository {
  readonly #database: SqliteDatabase;

  public constructor(database: SqliteDatabase) {
    this.#database = database;
  }

  public complete(args: { id: number; status: string; updatedAt: string }): void {
    this.#database
      .prepare(
        `
        UPDATE sync_runs
        SET completed_at = @updatedAt,
            status = @status
        WHERE id = @id
      `
      )
      .run(args);
  }

  public create(args: {
    channelDbId: number | null;
    runType: string;
    startedAt: string;
    status: string;
  }): number {
    const result = this.#database
      .prepare(
        `
        INSERT INTO sync_runs (
          run_type,
          channel_id,
          started_at,
          status
        ) VALUES (
          @runType,
          @channelDbId,
          @startedAt,
          @status
        )
      `
      )
      .run(args);

    return Number(result.lastInsertRowid);
  }
}
