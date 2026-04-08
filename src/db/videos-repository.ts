import type { SqliteDatabase } from "./client.js";
import type { TranscriptResult, VideoRecord } from "../types.js";

type VideoRow = {
  article: string | null;
  article_status: string | null;
  channel_id: number;
  comment_count_latest: number | null;
  content: string | null;
  created_at: string;
  id: number;
  language: string | null;
  last_view_refresh_at: string | null;
  like_count_latest: number | null;
  metadata_json: string | null;
  published_at: string;
  scraped_at: string | null;
  title: string;
  transcript_status: string;
  updated_at: string;
  video_id: string;
  view_count_latest: number | null;
};

type UpsertVideoArgs = {
  channelId: number;
  metadataJson: string;
  publishedAt: string;
  title: string;
  updatedAt: string;
  videoId: string;
};

const toVideoRecord = (row: VideoRow): VideoRecord => ({
  article: row.article,
  articleStatus: row.article_status,
  channelId: row.channel_id,
  commentCountLatest: row.comment_count_latest,
  content: row.content,
  createdAt: row.created_at,
  id: row.id,
  language: row.language,
  lastViewRefreshAt: row.last_view_refresh_at,
  likeCountLatest: row.like_count_latest,
  metadataJson: row.metadata_json,
  publishedAt: row.published_at,
  scrapedAt: row.scraped_at,
  title: row.title,
  transcriptStatus: row.transcript_status,
  updatedAt: row.updated_at,
  videoId: row.video_id,
  viewCountLatest: row.view_count_latest
});

export class VideosRepository {
  readonly #database: SqliteDatabase;

  public constructor(database: SqliteDatabase) {
    this.#database = database;
  }

  public createViewSnapshot(args: {
    commentCount: number | null;
    likeCount: number | null;
    snapshotAt: string;
    snapshotDate: string;
    videoId: number;
    viewCount: number | null;
  }): void {
    this.#database
      .prepare(
        `
        INSERT OR IGNORE INTO video_view_history (
          video_id,
          snapshot_date,
          snapshot_at,
          view_count,
          like_count,
          comment_count
        ) VALUES (
          @videoId,
          @snapshotDate,
          @snapshotAt,
          @viewCount,
          @likeCount,
          @commentCount
        )
      `
      )
      .run(args);
  }

  public findByVideoId(videoId: string): VideoRecord | null {
    const row = this.#database
      .prepare<[string], VideoRow | undefined>(
        `
        SELECT *
        FROM videos
        WHERE video_id = ?
        LIMIT 1
      `
      )
      .get(videoId);

    return row ? toVideoRecord(row) : null;
  }

  public listByChannelId(channelId: number): VideoRecord[] {
    const rows = this.#database
      .prepare(
        `
        SELECT *
        FROM videos
        WHERE channel_id = ?
        ORDER BY published_at DESC
      `
      )
      .all(channelId) as unknown as VideoRow[];
    return rows.map(toVideoRecord);
  }

  public listMissingTranscripts(channelId: number): VideoRecord[] {
    const rows = this.#database
      .prepare(
        `
        SELECT *
        FROM videos
        WHERE channel_id = ?
          AND transcript_status != 'ready'
        ORDER BY published_at DESC
      `
      )
      .all(channelId) as unknown as VideoRow[];
    return rows.map(toVideoRecord);
  }

  public setArticle(args: {
    article: string;
    articleStatus: string;
    updatedAt: string;
    videoId: string;
  }): void {
    this.#database
      .prepare(
        `
        UPDATE videos
        SET article = @article,
            article_status = @articleStatus,
            updated_at = @updatedAt
        WHERE video_id = @videoId
      `
      )
      .run(args);
  }

  public setTranscript(args: {
    result: TranscriptResult;
    scrapedAt: string;
    transcriptStatus: string;
    videoId: string;
  }): void {
    this.#database
      .prepare(
        `
        UPDATE videos
        SET content = @content,
            language = @language,
            metadata_json = json_set(
              COALESCE(metadata_json, '{}'),
              '$.segments',
              json(@segments)
            ),
            scraped_at = @scrapedAt,
            transcript_status = @transcriptStatus,
            updated_at = @scrapedAt
        WHERE video_id = @videoId
      `
      )
      .run({
        content: args.result.text,
        language: args.result.language,
        scrapedAt: args.scrapedAt,
        segments: JSON.stringify(args.result.segments),
        transcriptStatus: args.transcriptStatus,
        videoId: args.videoId
      });
  }

  public updateMetrics(args: {
    commentCountLatest: number | null;
    likeCountLatest: number | null;
    updatedAt: string;
    videoId: string;
    viewCountLatest: number | null;
  }): void {
    this.#database
      .prepare(
        `
        UPDATE videos
        SET view_count_latest = @viewCountLatest,
            like_count_latest = @likeCountLatest,
            comment_count_latest = @commentCountLatest,
            last_view_refresh_at = @updatedAt,
            updated_at = @updatedAt
        WHERE video_id = @videoId
      `
      )
      .run(args);
  }

  public upsert(args: UpsertVideoArgs): VideoRecord {
    this.#database
      .prepare(
        `
        INSERT INTO videos (
          channel_id,
          video_id,
          title,
          metadata_json,
          published_at,
          transcript_status,
          created_at,
          updated_at
        ) VALUES (
          @channelId,
          @videoId,
          @title,
          @metadataJson,
          @publishedAt,
          'pending',
          @updatedAt,
          @updatedAt
        )
        ON CONFLICT(video_id) DO UPDATE SET
          title = excluded.title,
          metadata_json = excluded.metadata_json,
          published_at = excluded.published_at,
          updated_at = excluded.updated_at
      `
      )
      .run(args);

    const video = this.findByVideoId(args.videoId);

    if (!video) {
      throw new Error(`Video ${args.videoId} was not found after upsert.`);
    }

    return video;
  }
}
