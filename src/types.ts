export type ChannelRecord = {
  id: number;
  channelId: string;
  channelName: string;
  channelHandle: string | null;
  channelUrl: string | null;
  uploadsPlaylistId: string | null;
  isTracked: boolean;
  untrackedAt: string | null;
  subscriberCountLatest: number | null;
  viewCountLatest: number | null;
  videoCountLatest: number | null;
  lastMetricsRefreshAt: string | null;
  createdAt: string;
  updatedAt: string;
  lastSyncedAt: string | null;
};

export type VideoRecord = {
  id: number;
  channelId: number;
  videoId: string;
  title: string;
  content: string | null;
  article: string | null;
  publishedAt: string;
  scrapedAt: string | null;
  lastViewRefreshAt: string | null;
  viewCountLatest: number | null;
  likeCountLatest: number | null;
  commentCountLatest: number | null;
  language: string | null;
  transcriptStatus: string;
  articleStatus: string | null;
  metadataJson: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TranscriptSegment = {
  text: string;
  offsetMs: number;
  durationMs: number;
};

export type TranscriptResult = {
  language: string | null;
  text: string;
  segments: TranscriptSegment[];
};

export type FailureRecord = {
  code: string;
  message: string;
  retryable: boolean;
  stage: string;
  videoId?: string;
};

export type RunResult<T> = {
  completed: boolean;
  failures: FailureRecord[];
  result: T;
};
