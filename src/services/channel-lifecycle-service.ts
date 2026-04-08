import { AppError } from "../errors.js";
import type { Repositories } from "../repositories.js";
import { toIsoNow } from "../utils/time.js";
import { buildResolveChannelArgs, parseChannelInput } from "../youtube/channel-input.js";
import type { YoutubeApi } from "../youtube/api.js";

export class ChannelLifecycleService {
  readonly #repositories: Repositories;

  readonly #youtubeApi: YoutubeApi;

  public constructor(repositories: Repositories, youtubeApi: YoutubeApi) {
    this.#repositories = repositories;
    this.#youtubeApi = youtubeApi;
  }

  public async add(channelValue: string) {
    const now = toIsoNow();
    const parsed = parseChannelInput(channelValue);
    const resolved = await this.#youtubeApi.getResolvedChannel(buildResolveChannelArgs(parsed));

    return this.#repositories.channels.upsert({
      channelHandle: resolved.channelHandle,
      channelId: resolved.channelId,
      channelName: resolved.channelName,
      channelUrl: resolved.channelUrl,
      createdAt: now,
      updatedAt: now,
      uploadsPlaylistId: resolved.uploadsPlaylistId
    });
  }

  public remove(channelValue: string): void {
    const channel = this.#findExistingChannel(channelValue);
    this.#repositories.channels.remove(channel.channelId);
  }

  public untrack(channelValue: string): void {
    const channel = this.#findExistingChannel(channelValue);
    this.#repositories.channels.setTracking(channel.channelId, false, toIsoNow());
  }

  #findExistingChannel(channelValue: string) {
    const parsed = parseChannelInput(channelValue);
    const channelId = parsed.kind === "channelId" ? parsed.value : null;

    if (!channelId) {
      throw new AppError(
        "Use a canonical channel ID or add the channel first so it is stored locally."
      );
    }

    const channel = this.#repositories.channels.findByChannelId(channelId);

    if (!channel) {
      throw new AppError(`Channel ${channelId} is not present in local storage.`);
    }

    return channel;
  }
}
