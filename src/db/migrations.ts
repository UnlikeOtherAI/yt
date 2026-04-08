export const migrations = [
  `
  CREATE TABLE IF NOT EXISTS channels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id TEXT NOT NULL UNIQUE,
    channel_name TEXT NOT NULL,
    channel_handle TEXT,
    channel_url TEXT,
    uploads_playlist_id TEXT,
    is_tracked INTEGER NOT NULL DEFAULT 1,
    untracked_at TEXT,
    subscriber_count_latest INTEGER,
    view_count_latest INTEGER,
    video_count_latest INTEGER,
    last_metrics_refresh_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    last_synced_at TEXT
  );

  CREATE TABLE IF NOT EXISTS videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id INTEGER NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    video_id TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    content TEXT,
    article TEXT,
    published_at TEXT NOT NULL,
    scraped_at TEXT,
    last_view_refresh_at TEXT,
    view_count_latest INTEGER,
    like_count_latest INTEGER,
    comment_count_latest INTEGER,
    language TEXT,
    transcript_status TEXT NOT NULL,
    article_status TEXT,
    metadata_json TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS video_view_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    snapshot_date TEXT NOT NULL,
    snapshot_at TEXT NOT NULL,
    view_count INTEGER,
    like_count INTEGER,
    comment_count INTEGER,
    metadata_json TEXT,
    UNIQUE(video_id, snapshot_at)
  );

  CREATE TABLE IF NOT EXISTS channel_metrics_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id INTEGER NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    snapshot_date TEXT NOT NULL,
    snapshot_at TEXT NOT NULL,
    subscriber_count INTEGER,
    view_count INTEGER,
    video_count INTEGER,
    metadata_json TEXT,
    UNIQUE(channel_id, snapshot_at)
  );

  CREATE TABLE IF NOT EXISTS sync_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_type TEXT NOT NULL,
    channel_id INTEGER REFERENCES channels(id) ON DELETE SET NULL,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    status TEXT NOT NULL,
    videos_inspected INTEGER NOT NULL DEFAULT 0,
    videos_inserted INTEGER NOT NULL DEFAULT 0,
    videos_updated INTEGER NOT NULL DEFAULT 0,
    transcripts_created INTEGER NOT NULL DEFAULT 0,
    view_snapshots_created INTEGER NOT NULL DEFAULT 0,
    error_json TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_channels_channel_id ON channels(channel_id);
  CREATE INDEX IF NOT EXISTS idx_channels_is_tracked ON channels(is_tracked);
  CREATE INDEX IF NOT EXISTS idx_videos_channel_id ON videos(channel_id);
  CREATE INDEX IF NOT EXISTS idx_videos_video_id ON videos(video_id);
  CREATE INDEX IF NOT EXISTS idx_videos_transcript_status ON videos(transcript_status);
  CREATE INDEX IF NOT EXISTS idx_video_view_history_video_id_snapshot_at
    ON video_view_history(video_id, snapshot_at);
  CREATE INDEX IF NOT EXISTS idx_channel_metrics_history_channel_id_snapshot_at
    ON channel_metrics_history(channel_id, snapshot_at);
  `
];
