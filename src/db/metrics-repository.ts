import type { SqliteDatabase } from "./client.js";

export class MetricsRepository {
  readonly #database: SqliteDatabase;

  public constructor(database: SqliteDatabase) {
    this.#database = database;
  }

  public createChannelSnapshot(args: {
    channelId: number;
    snapshotAt: string;
    snapshotDate: string;
    subscriberCount: number | null;
    videoCount: number | null;
    viewCount: number | null;
  }): void {
    this.#database
      .prepare(
        `
        INSERT OR IGNORE INTO channel_metrics_history (
          channel_id,
          snapshot_date,
          snapshot_at,
          subscriber_count,
          view_count,
          video_count
        ) VALUES (
          @channelId,
          @snapshotDate,
          @snapshotAt,
          @subscriberCount,
          @viewCount,
          @videoCount
        )
      `
      )
      .run(args);
  }
}
