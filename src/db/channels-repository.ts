import type { Statement } from "better-sqlite3";

import type { SqliteDatabase } from "./client.js";
import type { ChannelRecord } from "../types.js";

type ChannelRow = {
  channel_handle: string | null;
  channel_id: string;
  channel_name: string;
  channel_url: string | null;
  created_at: string;
  id: number;
  is_tracked: number;
  last_metrics_refresh_at: string | null;
  last_synced_at: string | null;
  subscriber_count_latest: number | null;
  untracked_at: string | null;
  updated_at: string;
  uploads_playlist_id: string | null;
  video_count_latest: number | null;
  view_count_latest: number | null;
};

type UpsertArgs = {
  channelHandle: string | null;
  channelId: string;
  channelName: string;
  channelUrl: string | null;
  createdAt: string;
  updatedAt: string;
  uploadsPlaylistId: string | null;
};

const toChannelRecord = (row: ChannelRow): ChannelRecord => ({
  channelHandle: row.channel_handle,
  channelId: row.channel_id,
  channelName: row.channel_name,
  channelUrl: row.channel_url,
  createdAt: row.created_at,
  id: row.id,
  isTracked: row.is_tracked === 1,
  lastMetricsRefreshAt: row.last_metrics_refresh_at,
  lastSyncedAt: row.last_synced_at,
  subscriberCountLatest: row.subscriber_count_latest,
  untrackedAt: row.untracked_at,
  updatedAt: row.updated_at,
  uploadsPlaylistId: row.uploads_playlist_id,
  videoCountLatest: row.video_count_latest,
  viewCountLatest: row.view_count_latest
});

export class ChannelsRepository {
  readonly #database: SqliteDatabase;

  readonly #findByChannelIdStatement: Statement<[string], ChannelRow | undefined>;

  readonly #listTrackedStatement: Statement<[], ChannelRow[]>;

  readonly #upsertStatement: Statement<UpsertArgs>;

  public constructor(database: SqliteDatabase) {
    this.#database = database;
    this.#findByChannelIdStatement = database.prepare(`
      SELECT *
      FROM channels
      WHERE channel_id = ?
      LIMIT 1
    `);
    this.#listTrackedStatement = database.prepare(`
      SELECT *
      FROM channels
      WHERE is_tracked = 1
      ORDER BY channel_name ASC
    `);
    this.#upsertStatement = database.prepare(`
      INSERT INTO channels (
        channel_id,
        channel_name,
        channel_handle,
        channel_url,
        uploads_playlist_id,
        is_tracked,
        created_at,
        updated_at
      ) VALUES (
        @channelId,
        @channelName,
        @channelHandle,
        @channelUrl,
        @uploadsPlaylistId,
        1,
        @createdAt,
        @updatedAt
      )
      ON CONFLICT(channel_id) DO UPDATE SET
        channel_name = excluded.channel_name,
        channel_handle = excluded.channel_handle,
        channel_url = excluded.channel_url,
        uploads_playlist_id = excluded.uploads_playlist_id,
        updated_at = excluded.updated_at
    `);
  }

  public findByChannelId(channelId: string): ChannelRecord | null {
    const row = this.#findByChannelIdStatement.get(channelId);
    return row ? toChannelRecord(row) : null;
  }

  public listTracked(): ChannelRecord[] {
    return this.#listTrackedStatement.all().map(toChannelRecord);
  }

  public markMetricsRefreshed(channelId: string, refreshedAt: string): void {
    this.#database
      .prepare(
        `
        UPDATE channels
        SET last_metrics_refresh_at = ?,
            updated_at = ?
        WHERE channel_id = ?
      `
      )
      .run(refreshedAt, refreshedAt, channelId);
  }

  public markSynced(channelId: string, syncedAt: string): void {
    this.#database
      .prepare(
        `
        UPDATE channels
        SET last_synced_at = ?,
            updated_at = ?
        WHERE channel_id = ?
      `
      )
      .run(syncedAt, syncedAt, channelId);
  }

  public remove(channelId: string): void {
    this.#database.prepare(`DELETE FROM channels WHERE channel_id = ?`).run(channelId);
  }

  public setTracking(channelId: string, isTracked: boolean, changedAt: string): void {
    this.#database
      .prepare(
        `
        UPDATE channels
        SET is_tracked = ?,
            untracked_at = ?,
            updated_at = ?
        WHERE channel_id = ?
      `
      )
      .run(isTracked ? 1 : 0, isTracked ? null : changedAt, changedAt, channelId);
  }

  public updateMetrics(args: {
    channelId: string;
    subscriberCountLatest: number | null;
    updatedAt: string;
    videoCountLatest: number | null;
    viewCountLatest: number | null;
  }): void {
    this.#database
      .prepare(
        `
        UPDATE channels
        SET subscriber_count_latest = @subscriberCountLatest,
            video_count_latest = @videoCountLatest,
            view_count_latest = @viewCountLatest,
            last_metrics_refresh_at = @updatedAt,
            updated_at = @updatedAt
        WHERE channel_id = @channelId
      `
      )
      .run(args);
  }

  public upsert(args: UpsertArgs): ChannelRecord {
    this.#upsertStatement.run(args);
    const channel = this.findByChannelId(args.channelId);

    if (!channel) {
      throw new Error(`Channel ${args.channelId} was not found after upsert.`);
    }

    return channel;
  }
}
