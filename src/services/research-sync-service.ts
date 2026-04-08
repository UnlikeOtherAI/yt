import pLimit from "p-limit";

import { AppError, EXIT_CODE } from "../errors.js";
import type { Repositories } from "../repositories.js";
import type { FailureRecord, VideoRecord } from "../types.js";
import { toIsoNow } from "../utils/time.js";
import { parseChannelInput } from "../youtube/channel-input.js";
import type { YoutubeApi } from "../youtube/api.js";
import { ArticleGenerator } from "./article-generator.js";
import { TranscriptProvider } from "./transcript-provider.js";

type SyncOptions = {
  channelValue?: string;
  concurrency: number;
  generateArticles: boolean;
  limit: number;
  maxVideosInspected: number;
};

export class ResearchSyncService {
  readonly #articleGenerator: ArticleGenerator;

  readonly #repositories: Repositories;

  readonly #transcriptProvider: TranscriptProvider;

  readonly #youtubeApi: YoutubeApi;

  public constructor(
    repositories: Repositories,
    youtubeApi: YoutubeApi,
    transcriptProvider: TranscriptProvider,
    articleGenerator: ArticleGenerator
  ) {
    this.#repositories = repositories;
    this.#youtubeApi = youtubeApi;
    this.#transcriptProvider = transcriptProvider;
    this.#articleGenerator = articleGenerator;
  }

  public async sync(options: SyncOptions) {
    const channels = options.channelValue
      ? [await this.#resolveAndUpsertChannel(options.channelValue)]
      : this.#repositories.channels.listTracked();
    const failures: FailureRecord[] = [];
    const syncedVideos: VideoRecord[] = [];

    for (const channel of channels) {
      const startedAt = toIsoNow();
      const syncRunId = this.#repositories.syncRuns.create({
        channelDbId: channel.id,
        runType: options.generateArticles ? "articles-generate" : "research-sync",
        startedAt,
        status: "running"
      });

      try {
        const newVideos = await this.#syncChannel(channel.channelId, {
          concurrency: options.concurrency,
          failures,
          generateArticles: options.generateArticles,
          limit: options.limit,
          maxVideosInspected: options.maxVideosInspected
        });

        syncedVideos.push(...newVideos);
        this.#repositories.channels.markSynced(channel.channelId, toIsoNow());
        this.#repositories.syncRuns.complete({
          id: syncRunId,
          status: "completed",
          updatedAt: toIsoNow()
        });
      } catch (error) {
        this.#repositories.syncRuns.complete({
          id: syncRunId,
          status: "failed",
          updatedAt: toIsoNow()
        });
        throw error;
      }
    }

    return {
      completed: failures.every((failure) => !failure.retryable),
      failures,
      videos: syncedVideos
    };
  }

  async #fetchPlaylistVideoIds(uploadsPlaylistId: string, maxVideosInspected: number) {
    const collectedVideoIds: string[] = [];
    const seenVideoIds = new Set<string>();
    let nextPageToken: string | undefined;

    while (collectedVideoIds.length < maxVideosInspected) {
      const page = await this.#youtubeApi.getPlaylistVideos(uploadsPlaylistId, nextPageToken);

      if (page.items.length === 0) {
        break;
      }

      for (const item of page.items) {
        const videoId = item.contentDetails?.videoId;

        if (!videoId || seenVideoIds.has(videoId)) {
          continue;
        }

        seenVideoIds.add(videoId);
        collectedVideoIds.push(videoId);

        if (collectedVideoIds.length >= maxVideosInspected) {
          break;
        }
      }

      if (!page.nextPageToken) {
        break;
      }

      nextPageToken = page.nextPageToken;
    }

    return collectedVideoIds;
  }

  async #generateArticle(video: VideoRecord, failures: FailureRecord[]): Promise<void> {
    if (!video.content) {
      return;
    }

    try {
      const generated = await this.#articleGenerator.generate({
        title: video.title,
        transcriptText: video.content
      });
      this.#repositories.videos.setArticle({
        article: generated.article,
        articleStatus: generated.coverageReport.passed ? "ready" : "partial",
        updatedAt: toIsoNow(),
        videoId: video.videoId
      });
    } catch (error) {
      failures.push({
        code: "ARTICLE_GENERATION_FAILED",
        message: error instanceof Error ? error.message : "Unknown article error.",
        retryable: false,
        stage: "article-generate",
        videoId: video.videoId
      });
    }
  }

  async #resolveAndUpsertChannel(channelValue: string) {
    const parsed = parseChannelInput(channelValue);
    const resolved = await this.#youtubeApi.getResolvedChannel({
      channelId: parsed.kind === "channelId" ? parsed.value : undefined,
      customUrl: parsed.kind === "customUrl" ? parsed.value : undefined,
      handle: parsed.kind === "handle" ? parsed.value : undefined,
      username: parsed.kind === "username" ? parsed.value : undefined
    });

    return this.#repositories.channels.upsert({
      channelHandle: resolved.channelHandle,
      channelId: resolved.channelId,
      channelName: resolved.channelName,
      channelUrl: resolved.channelUrl,
      createdAt: toIsoNow(),
      updatedAt: toIsoNow(),
      uploadsPlaylistId: resolved.uploadsPlaylistId
    });
  }

  async #syncChannel(
    channelId: string,
    options: Omit<SyncOptions, "channelValue"> & { failures: FailureRecord[] }
  ) {
    const channel = this.#repositories.channels.findByChannelId(channelId);

    if (!channel?.uploadsPlaylistId) {
      throw new AppError(`Channel ${channelId} is missing an uploads playlist ID.`);
    }

    const videoIds = await this.#fetchPlaylistVideoIds(
      channel.uploadsPlaylistId,
      options.maxVideosInspected
    );
    const videoDetails = await this.#youtubeApi.getVideoDetails(videoIds);

    for (const detail of videoDetails) {
      this.#repositories.videos.upsert({
        channelId: channel.id,
        metadataJson: detail.metadataJson,
        publishedAt: detail.publishedAt,
        title: detail.title,
        updatedAt: toIsoNow(),
        videoId: detail.videoId
      });
    }

    const pendingVideos = this.#repositories
      .listMissingTranscripts(channel.id)
      .slice(0, options.limit);

    const limit = pLimit(options.concurrency);
    await Promise.all(
      pendingVideos.map(async (video) =>
        limit(async () => {
          try {
            const transcript = await this.#transcriptProvider.fetch(video.videoId);
            this.#repositories.videos.setTranscript({
              result: transcript,
              scrapedAt: toIsoNow(),
              transcriptStatus: "ready",
              videoId: video.videoId
            });
          } catch (error) {
            options.failures.push(this.#transcriptProvider.toFailure(error, video.videoId));
          }
        })
      )
    );

    const readyVideos = this.#repositories
      .listByChannelId(channel.id)
      .filter((video) => video.transcriptStatus === "ready")
      .slice(0, options.limit);

    if (options.generateArticles) {
      for (const video of readyVideos) {
        await this.#generateArticle(video, options.failures);
      }
    }

    return readyVideos;
  }
}
