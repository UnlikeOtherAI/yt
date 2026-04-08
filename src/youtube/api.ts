import { AppError, EXIT_CODE } from "../errors.js";

type PlaylistItem = {
  contentDetails?: { videoId?: string };
  snippet?: {
    channelId?: string;
    channelTitle?: string;
    description?: string;
    publishedAt?: string;
    title?: string;
  };
};

type VideoItem = {
  id?: string;
  snippet?: {
    channelId?: string;
    channelTitle?: string;
    description?: string;
    publishedAt?: string;
    title?: string;
  };
  statistics?: {
    commentCount?: string;
    likeCount?: string;
    viewCount?: string;
  };
};

type ChannelItem = {
  id?: string;
  contentDetails?: { relatedPlaylists?: { uploads?: string } };
  snippet?: { customUrl?: string; title?: string };
  statistics?: {
    hiddenSubscriberCount?: boolean;
    subscriberCount?: string;
    videoCount?: string;
    viewCount?: string;
  };
};

type ListResponse<T> = {
  items?: T[];
  nextPageToken?: string;
  pageInfo?: { totalResults?: number };
};

const numberFromString = (value?: string) => (value ? Number(value) : null);

export type ResolvedChannel = {
  channelHandle: string | null;
  channelId: string;
  channelName: string;
  channelUrl: string;
  subscriberCount: number | null;
  uploadsPlaylistId: string;
  videoCount: number | null;
  viewCount: number | null;
};

export type VideoDetails = {
  channelId: string;
  channelTitle: string;
  commentCount: number | null;
  description: string;
  likeCount: number | null;
  metadataJson: string;
  publishedAt: string;
  title: string;
  videoId: string;
  viewCount: number | null;
};

export class YoutubeApi {
  readonly #apiKey: string;

  public constructor(apiKey: string) {
    this.#apiKey = apiKey;
  }

  async #get<T>(path: string, params: Record<string, string | undefined>): Promise<T> {
    const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);

    for (const [key, value] of Object.entries({ ...params, key: this.#apiKey })) {
      if (value) {
        url.searchParams.set(key, value);
      }
    }

    const response = await fetch(url);

    if (!response.ok) {
      const body = await response.text();
      throw new AppError(`YouTube API request failed: ${body}`, EXIT_CODE.upstreamFailure);
    }

    return (await response.json()) as T;
  }

  async getPlaylistVideos(
    playlistId: string,
    pageToken?: string
  ): Promise<{ items: PlaylistItem[]; nextPageToken?: string }> {
    const response = await this.#get<ListResponse<PlaylistItem>>("playlistItems", {
      maxResults: "50",
      pageToken,
      part: "snippet,contentDetails",
      playlistId
    });

    return {
      items: response.items ?? [],
      nextPageToken: response.nextPageToken
    };
  }

  async getResolvedChannel(
    args: { channelId?: string; customUrl?: string; handle?: string; username?: string }
  ): Promise<ResolvedChannel> {
    const response = await this.#get<ListResponse<ChannelItem>>("channels", {
      forHandle: args.handle,
      forUsername: args.username,
      id: args.channelId,
      part: "snippet,contentDetails,statistics"
    });

    const item = response.items?.[0];

    if (item?.id && item.contentDetails?.relatedPlaylists?.uploads && item.snippet?.title) {
      return {
        channelHandle: item.snippet.customUrl ?? args.handle ?? null,
        channelId: item.id,
        channelName: item.snippet.title,
        channelUrl: `https://www.youtube.com/channel/${item.id}`,
        subscriberCount: item.statistics?.hiddenSubscriberCount
          ? null
          : numberFromString(item.statistics?.subscriberCount),
        uploadsPlaylistId: item.contentDetails.relatedPlaylists.uploads,
        videoCount: numberFromString(item.statistics?.videoCount),
        viewCount: numberFromString(item.statistics?.viewCount)
      };
    }

    if (args.customUrl) {
      const search = await this.#get<ListResponse<ChannelItem>>("search", {
        maxResults: "1",
        part: "snippet",
        q: args.customUrl,
        type: "channel"
      });
      const channelId = search.items?.[0]?.id;

      if (channelId) {
        return this.getResolvedChannel({ channelId });
      }
    }

    throw new AppError("Unable to resolve the provided YouTube channel.", EXIT_CODE.runtimeError);
  }

  async getVideoDetails(videoIds: string[]): Promise<VideoDetails[]> {
    if (videoIds.length === 0) {
      return [];
    }

    const response = await this.#get<ListResponse<VideoItem>>("videos", {
      id: videoIds.join(","),
      part: "snippet,statistics"
    });

    return (response.items ?? []).flatMap((item) => {
      const videoId = item.id;
      const title = item.snippet?.title;
      const publishedAt = item.snippet?.publishedAt;
      const channelId = item.snippet?.channelId;
      const channelTitle = item.snippet?.channelTitle;

      if (!videoId || !title || !publishedAt || !channelId || !channelTitle) {
        return [];
      }

      return [
        {
          channelId,
          channelTitle,
          commentCount: numberFromString(item.statistics?.commentCount),
          description: item.snippet.description ?? "",
          likeCount: numberFromString(item.statistics?.likeCount),
          metadataJson: JSON.stringify(item),
          publishedAt,
          title,
          videoId,
          viewCount: numberFromString(item.statistics?.viewCount)
        }
      ];
    });
  }
}
