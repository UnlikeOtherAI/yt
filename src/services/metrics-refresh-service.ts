import { AppError } from "../errors.js";
import type { Repositories } from "../repositories.js";
import { toSnapshotDate } from "../utils/time.js";
import { parseChannelInput } from "../youtube/channel-input.js";
import type { YoutubeApi } from "../youtube/api.js";

export class MetricsRefreshService {
  readonly #repositories: Repositories;

  readonly #youtubeApi: YoutubeApi;

  public constructor(repositories: Repositories, youtubeApi: YoutubeApi) {
    this.#repositories = repositories;
    this.#youtubeApi = youtubeApi;
  }

  public async refresh(channelValue?: string) {
    const channels = channelValue
      ? [this.#getTargetChannel(channelValue)]
      : this.#repositories.channels.listTracked();
    const now = new Date();
    const snapshotAt = now.toISOString();
    const snapshotDate = toSnapshotDate(now);

    for (const channel of channels) {
      const resolved = await this.#youtubeApi.getResolvedChannel({ channelId: channel.channelId });
      this.#repositories.channels.updateMetrics({
        channelId: channel.channelId,
        subscriberCountLatest: resolved.subscriberCount,
        updatedAt: snapshotAt,
        videoCountLatest: resolved.videoCount,
        viewCountLatest: resolved.viewCount
      });
      this.#repositories.metrics.createChannelSnapshot({
        channelId: channel.id,
        snapshotAt,
        snapshotDate,
        subscriberCount: resolved.subscriberCount,
        videoCount: resolved.videoCount,
        viewCount: resolved.viewCount
      });

      const videos = this.#repositories.videos.listByChannelId(channel.id);
      await this.#refreshVideoMetrics(videos, snapshotAt, snapshotDate);

      this.#repositories.channels.markMetricsRefreshed(channel.channelId, snapshotAt);
    }

    return {
      channelCount: channels.length,
      completedAt: snapshotAt
    };
  }

  #getTargetChannel(channelValue: string) {
    const parsed = parseChannelInput(channelValue);
    const channelId = parsed.kind === "channelId" ? parsed.value : null;

    if (!channelId) {
      throw new AppError(
        "metrics refresh currently requires a canonical channel ID already stored locally."
      );
    }

    const channel = this.#repositories.channels.findByChannelId(channelId);

    if (!channel) {
      throw new AppError(`Channel ${channelId} is not stored locally.`);
    }

    return channel;
  }

  async #refreshVideoMetrics(
    videos: ReturnType<Repositories["videos"]["listByChannelId"]>,
    snapshotAt: string,
    snapshotDate: string
  ): Promise<void> {
    const detailChunks = chunk(videos.map((video) => video.videoId), 50);
    const storedVideos = new Map(videos.map((video) => [video.videoId, video] as const));

    for (const detailChunk of detailChunks) {
      const details = await this.#youtubeApi.getVideoDetails(detailChunk);

      for (const detail of details) {
        const video = storedVideos.get(detail.videoId);

        if (video) {
          this.#applyVideoMetrics(video.id, detail, snapshotAt, snapshotDate);
        }
      }
    }
  }

  #applyVideoMetrics(
    databaseVideoId: number,
    detail: Awaited<ReturnType<YoutubeApi["getVideoDetails"]>>[number],
    snapshotAt: string,
    snapshotDate: string
  ): void {
    this.#repositories.videos.updateMetrics({
      commentCountLatest: detail.commentCount,
      likeCountLatest: detail.likeCount,
      updatedAt: snapshotAt,
      videoId: detail.videoId,
      viewCountLatest: detail.viewCount
    });
    this.#repositories.videos.createViewSnapshot({
      commentCount: detail.commentCount,
      likeCount: detail.likeCount,
      snapshotAt,
      snapshotDate,
      videoId: databaseVideoId,
      viewCount: detail.viewCount
    });
  }
}

const chunk = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
};
