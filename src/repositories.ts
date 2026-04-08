import type { SqliteDatabase } from "./db/client.js";
import { ChannelsRepository } from "./db/channels-repository.js";
import { MetricsRepository } from "./db/metrics-repository.js";
import { SyncRunsRepository } from "./db/sync-runs-repository.js";
import { VideosRepository } from "./db/videos-repository.js";

export const createRepositories = (database: SqliteDatabase) => ({
  channels: new ChannelsRepository(database),
  metrics: new MetricsRepository(database),
  syncRuns: new SyncRunsRepository(database),
  videos: new VideosRepository(database)
});

export type Repositories = ReturnType<typeof createRepositories>;
