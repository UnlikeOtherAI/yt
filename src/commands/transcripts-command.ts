import { Command, Option } from "commander";

import { createAppContext } from "../app-context.js";
import { printJson } from "../utils/json-output.js";
import { parsePositiveInteger, writeHuman } from "./command-helpers.js";
import {
  runVideoAction,
  VIDEO_FORMATS,
  type VideoFormat
} from "./transcripts-video-action.js";

type FetchOptions = {
  channel: string;
  concurrency: string;
  json?: boolean;
  limit: string;
  maxVideosInspected: string;
};

type VideoCommandOptions = {
  format: string;
  output?: string;
  url: string;
};

const fetchAction = async (options: FetchOptions) => {
  const context = createAppContext();
  const result = await context.researchSyncService.sync({
    channelValue: options.channel,
    concurrency: parsePositiveInteger(options.concurrency, "concurrency"),
    generateArticles: false,
    limit: parsePositiveInteger(options.limit, "limit"),
    maxVideosInspected: parsePositiveInteger(
      options.maxVideosInspected,
      "max-videos-inspected"
    )
  });
  const payload = {
    request: {
      channel: options.channel,
      dataDir: context.config.dataDir,
      limit: parsePositiveInteger(options.limit, "limit")
    },
    result: {
      completed: result.completed,
      databasePath: context.config.databasePath,
      failures: result.failures,
      successfulCount: result.videos.length,
      transcripts: result.videos
    },
    schemaVersion: "1"
  };

  if (options.json) {
    printJson(payload);
    return;
  }

  writeHuman(`Fetched ${String(result.videos.length)} transcript(s).`);
};

const videoAction = async (options: VideoCommandOptions) => {
  await runVideoAction({
    format: options.format as VideoFormat,
    ...(options.output === undefined ? {} : { output: options.output }),
    url: options.url
  });
};

export const registerTranscriptsCommand = (program: Command) => {
  const transcripts = program
    .command("transcripts")
    .description("Fetch and persist YouTube transcripts.");

  transcripts
    .command("fetch")
    .description("Fetch transcripts for a YouTube channel.")
    .requiredOption("--channel <value>", "Channel URL, @handle, username URL, or channel ID.")
    .option("--concurrency <number>", "Concurrent transcript fetches.", "2")
    .option("--json", "Write structured JSON to stdout.")
    .option("--limit <number>", "Maximum number of ready transcripts to return.", "25")
    .option("--max-videos-inspected <number>", "Maximum number of uploads to inspect.", "100")
    .action(fetchAction);

  transcripts
    .command("video")
    .description("Fetch transcript for a single YouTube video URL or ID.")
    .requiredOption("--url <value>", "Video URL (youtu.be / youtube.com) or 11-char video ID.")
    .addOption(
      new Option("--format <type>", "Output format.")
        .choices([...VIDEO_FORMATS])
        .default("markdown")
    )
    .option("-o, --output <path>", "Write output to file instead of stdout.")
    .action(videoAction);
};
