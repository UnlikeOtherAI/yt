# Data Model

## Purpose

The tool should persist research data locally so repeat runs can avoid doing the
same work twice and can build time-series metrics over time.

## Storage Location

Default home-directory storage:

- data directory: `~/.yt/`
- SQLite database: `~/.yt/yt.sqlite`

The CLI may allow override via `--data-dir` or `YT_DATA_DIR`, but the default
should be stable and predictable.

## Core Principles

- SQLite is the local system of record
- channel rows are normalized and referenced by videos
- videos are unique by YouTube `videoId`
- transcript content is stored once per video unless versioning is later needed
- view history is append-only and time-series oriented
- repeated syncs must do delta work only

## Tables

### `channels`

One row per YouTube channel.

Suggested fields:

- `id` integer primary key
- `channel_id` text unique not null
- `channel_name` text not null
- `channel_handle` text null
- `channel_url` text null
- `uploads_playlist_id` text null
- `is_tracked` integer not null default 1
- `untracked_at` text null
- `subscriber_count_latest` integer null
- `view_count_latest` integer null
- `video_count_latest` integer null
- `last_metrics_refresh_at` text null
- `created_at` text not null
- `updated_at` text not null
- `last_synced_at` text null

### `videos`

One row per YouTube video.

Suggested fields:

- `id` integer primary key
- `channel_id` integer not null references `channels(id)`
- `video_id` text unique not null
- `title` text not null
- `content` text null
- `article` text null
- `published_at` text not null
- `scraped_at` text null
- `last_view_refresh_at` text null
- `view_count_latest` integer null
- `like_count_latest` integer null
- `comment_count_latest` integer null
- `language` text null
- `transcript_status` text not null
- `article_status` text null
- `metadata_json` text null
- `created_at` text not null
- `updated_at` text not null

Notes:

- `content` is the canonical transcript-derived text payload for the video
- raw segment data can live in `metadata_json` initially, but a separate table is
  acceptable if it becomes too large or too query-heavy

### `video_view_history`

Append-only time-series snapshots for popularity tracking.

Suggested fields:

- `id` integer primary key
- `video_id` integer not null references `videos(id)`
- `snapshot_date` text not null
- `snapshot_at` text not null
- `view_count` integer null
- `like_count` integer null
- `comment_count` integer null
- `metadata_json` text null

Suggested uniqueness:

- unique on `video_id, snapshot_at`

This supports multiple captures per day and is suitable for later trend charts.

### `channel_metrics_history`

Append-only channel-level snapshots for subscriber and aggregate channel metrics.

Suggested fields:

- `id` integer primary key
- `channel_id` integer not null references `channels(id)`
- `snapshot_date` text not null
- `snapshot_at` text not null
- `subscriber_count` integer null
- `view_count` integer null
- `video_count` integer null
- `metadata_json` text null

Suggested uniqueness:

- unique on `channel_id, snapshot_at`

This supports multiple captures per day and allows correlation between new video
releases and subscriber growth.

### `sync_runs`

Track what a run did for auditability and debugging.

Suggested fields:

- `id` integer primary key
- `run_type` text not null
- `channel_id` integer null references `channels(id)`
- `started_at` text not null
- `completed_at` text null
- `status` text not null
- `videos_inspected` integer not null default 0
- `videos_inserted` integer not null default 0
- `videos_updated` integer not null default 0
- `transcripts_created` integer not null default 0
- `view_snapshots_created` integer not null default 0
- `error_json` text null

## Delta Sync Rules

For `yt research sync`:

- resolve the channel
- read the local channel row if it exists
- operate only on tracked channels unless explicitly told otherwise
- walk channel uploads in reverse chronological order
- stop when previously known videos make it safe to stop, or when
  `maxVideosInspected` is reached
- upsert new videos
- fetch transcript content only for videos missing transcript content or
  explicitly marked for retry
- update `scraped_at` when transcript retrieval is attempted

The goal is not to redownload old transcripts every day.

## Metrics Refresh Rules

For `yt metrics refresh`:

- select existing videos for the target channel
- fetch current metrics from the YouTube API
- fetch current channel-level metrics including subscribers where available
- update latest counters on `videos`
- update latest counters on `channels`
- insert one append-only row into `video_view_history` per video for the current
  snapshot time
- insert one append-only row into `channel_metrics_history` per channel refresh
  time
- skip duplicate snapshot rows for the same video and timestamp unless explicit
  overwrite behavior is added later

## Date Fields

Required dates across the model:

- `published_at`: when the video was published on YouTube
- `scraped_at`: when transcript scraping was last attempted
- `last_synced_at`: when the channel was last synced
- `last_view_refresh_at`: when latest counters were refreshed
- `last_metrics_refresh_at`: when latest channel counters were refreshed
- `untracked_at`: when tracking was disabled for the channel
- `snapshot_date`: date bucket for metrics history
- `snapshot_at`: precise timestamp of a metrics capture

## Metadata Direction

Store useful YouTube metadata whenever available, including:

- channel title
- video title
- video description if useful later
- duration
- tags if exposed
- privacy/public visibility if exposed
- view count
- like count
- comment count
- subscriber count
- channel video count

Use explicit columns for fields we expect to query often. Use `metadata_json`
for less frequently queried fields.

## Query Priorities

The initial schema should make these cheap:

- find all channels
- find all tracked channels
- find all videos for a channel
- find videos missing transcript content
- find videos needing metric refresh
- load view history for one video
- load latest metrics for a channel
- load channel subscriber history

## Migration Rules

- use explicit SQL migrations
- never silently rewrite user data
- treat schema changes as versioned changes
- index `channels.channel_id`, `videos.video_id`, `videos.channel_id`, and
  `video_view_history(video_id, snapshot_at)`
- index `channels.is_tracked` and
  `channel_metrics_history(channel_id, snapshot_at)`

## Channel Lifecycle Rules

### `yt channels add`

- create the channel row if it does not exist
- set `is_tracked = 1`
- clear `untracked_at`
- do not create duplicate rows

### `yt channels untrack`

- set `is_tracked = 0`
- set `untracked_at`
- preserve all historical video, transcript, and metrics data

### `yt channels remove`

- remove the channel row and all dependent local data
- this is destructive and should require explicit confirmation in human mode
