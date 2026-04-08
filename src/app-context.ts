import { loadConfig } from "./config.js";
import type { SqliteDatabase } from "./db/client.js";
import { createDatabase } from "./db/client.js";
import { AppError, EXIT_CODE } from "./errors.js";
import { createLogger } from "./logger.js";
import { createRepositories } from "./repositories.js";
import { ArticleGenerator } from "./services/article-generator.js";
import { ChannelLifecycleService } from "./services/channel-lifecycle-service.js";
import { MetricsRefreshService } from "./services/metrics-refresh-service.js";
import { ResearchSyncService } from "./services/research-sync-service.js";
import { TranscriptProvider } from "./services/transcript-provider.js";
import { YoutubeApi } from "./youtube/api.js";

export type AppContext = {
  articleGenerator: ArticleGenerator;
  channelLifecycleService: ChannelLifecycleService;
  config: ReturnType<typeof loadConfig>;
  database: SqliteDatabase;
  logger: ReturnType<typeof createLogger>;
  metricsRefreshService: MetricsRefreshService;
  researchSyncService: ResearchSyncService;
};

export const createAppContext = (): AppContext => {
  const config = loadConfig();
  const logger = createLogger(config.logLevel);
  const database = createDatabase(config.databasePath);
  const repositories = createRepositories(database);
  const youtubeApiKey = config.youtubeApiKey;

  if (!youtubeApiKey) {
    throw new AppError(
      "YOUTUBE_API_KEY is required for phase one commands.",
      EXIT_CODE.runtimeError
    );
  }

  const youtubeApi = new YoutubeApi(youtubeApiKey);
  const transcriptProvider = new TranscriptProvider(config.dataDir);
  const articleGenerator = new ArticleGenerator(config.geminiApiKey, config.geminiModel);

  return {
    articleGenerator,
    channelLifecycleService: new ChannelLifecycleService(repositories, youtubeApi),
    config,
    database,
    logger,
    metricsRefreshService: new MetricsRefreshService(repositories, youtubeApi),
    researchSyncService: new ResearchSyncService(
      repositories,
      youtubeApi,
      transcriptProvider,
      articleGenerator
    )
  };
};
