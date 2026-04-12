import { writeFile } from "node:fs/promises";

import type { AppConfig } from "../config.js";
import { loadConfig } from "../config.js";
import { AppError, EXIT_CODE } from "../errors.js";
import { ArticleGenerator } from "../services/article-generator.js";
import {
  formatMarkdownDocument,
  formatParagraphs,
  formatText,
  formatTimestamped,
  type VideoMetadata
} from "../services/transcript-formatter.js";
import { TranscriptProvider } from "../services/transcript-provider.js";
import type { TranscriptResult } from "../types.js";
import { printJson } from "../utils/json-output.js";
import { YoutubeApi } from "../youtube/api.js";
import { parseVideoInput } from "../youtube/video-input.js";
import { writeHuman } from "./command-helpers.js";

export const VIDEO_FORMATS = [
  "markdown",
  "article",
  "paragraphs",
  "text",
  "timestamps",
  "json"
] as const;

export type VideoFormat = (typeof VIDEO_FORMATS)[number];

export type VideoActionOptions = {
  format: VideoFormat;
  output?: string;
  url: string;
};

const LLM_FORMATS = new Set<VideoFormat>(["markdown", "article"]);

const buildVideoUrl = (videoId: string): string => `https://www.youtube.com/watch?v=${videoId}`;

const fetchMetadata = async (
  config: AppConfig,
  videoId: string
): Promise<VideoMetadata> => {
  const base: VideoMetadata = {
    channelTitle: undefined,
    publishedAt: undefined,
    title: undefined,
    url: buildVideoUrl(videoId),
    videoId
  };

  if (!config.youtubeApiKey) {
    return base;
  }

  const api = new YoutubeApi(config.youtubeApiKey);
  const [details] = await api.getVideoDetails([videoId]);

  if (!details) {
    return base;
  }

  return {
    channelTitle: details.channelTitle,
    publishedAt: details.publishedAt,
    title: details.title,
    url: base.url,
    videoId
  };
};

const fetchTranscriptOrFail = async (
  provider: TranscriptProvider,
  videoId: string
): Promise<TranscriptResult> => {
  try {
    return await provider.fetch(videoId);
  } catch (error) {
    const failure = provider.toFailure(error, videoId);
    throw new AppError(
      `Failed to fetch transcript (${failure.code}): ${failure.message}`,
      failure.retryable ? EXIT_CODE.partialResult : EXIT_CODE.upstreamFailure
    );
  }
};

const requireGeminiKey = (config: AppConfig, format: VideoFormat): string => {
  if (!config.geminiApiKey) {
    throw new AppError(
      `--format ${format} requires GEMINI_API_KEY. Set it in ~/.yt/.env or ` +
        `use --format paragraphs for a no-LLM alternative.`,
      EXIT_CODE.usageError
    );
  }

  return config.geminiApiKey;
};

const renderArticle = async (
  config: AppConfig,
  metadata: VideoMetadata,
  transcript: TranscriptResult
): Promise<string> => {
  const apiKey = requireGeminiKey(config, "article");
  const generator = new ArticleGenerator(apiKey, config.geminiModel);
  const { article } = await generator.generate({
    title: metadata.title ?? `YouTube video ${metadata.videoId}`,
    transcriptText: transcript.text
  });

  return article.trim();
};

const renderForFormat = async (args: {
  config: AppConfig;
  format: VideoFormat;
  metadata: VideoMetadata;
  transcript: TranscriptResult;
}): Promise<string> => {
  switch (args.format) {
    case "markdown": {
      const body = await renderArticle(args.config, args.metadata, args.transcript);
      return formatMarkdownDocument({
        body,
        metadata: args.metadata,
        transcript: args.transcript
      });
    }
    case "article":
      return `${await renderArticle(args.config, args.metadata, args.transcript)}\n`;
    case "paragraphs":
      return `${formatParagraphs(args.transcript)}\n`;
    case "text":
      return `${formatText(args.transcript)}\n`;
    case "timestamps":
      return `${formatTimestamped(args.transcript)}\n`;
    case "json":
      return `${JSON.stringify(
        { metadata: args.metadata, transcript: args.transcript },
        undefined,
        2
      )}\n`;
  }
};

const emitOutput = async (
  format: VideoFormat,
  output: string,
  destination: string | undefined
): Promise<void> => {
  if (destination) {
    await writeFile(destination, output, "utf8");
    writeHuman(`Wrote ${format} output to ${destination}`);
    return;
  }

  if (format === "json") {
    printJson(JSON.parse(output));
    return;
  }

  process.stdout.write(output);
};

export const runVideoAction = async (options: VideoActionOptions): Promise<void> => {
  const videoId = parseVideoInput(options.url);
  const config = loadConfig();

  if (LLM_FORMATS.has(options.format)) {
    requireGeminiKey(config, options.format);
  }

  const provider = new TranscriptProvider(config.dataDir);
  const transcript = await fetchTranscriptOrFail(provider, videoId);
  const metadata = await fetchMetadata(config, videoId);
  const output = await renderForFormat({
    config,
    format: options.format,
    metadata,
    transcript
  });

  await emitOutput(options.format, output, options.output);
};
