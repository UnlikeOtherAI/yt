import { Command } from "commander";

import { createAppContext } from "../app-context.js";
import { printJson } from "../utils/json-output.js";
import { parsePositiveInteger, writeHuman } from "./command-helpers.js";

type TranscriptOptions = {
  channel: string;
  concurrency: string;
  json?: boolean;
  limit: string;
  maxVideosInspected: string;
};

const fetchAction = async (options: TranscriptOptions) => {
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

export const registerTranscriptsCommand = (program: Command) => {
  program
    .command("transcripts")
    .description("Fetch and persist YouTube transcripts.")
    .command("fetch")
    .description("Fetch transcripts for a YouTube channel.")
    .requiredOption("--channel <value>", "Channel URL, @handle, username URL, or channel ID.")
    .option("--concurrency <number>", "Concurrent transcript fetches.", "2")
    .option("--json", "Write structured JSON to stdout.")
    .option("--limit <number>", "Maximum number of ready transcripts to return.", "25")
    .option("--max-videos-inspected <number>", "Maximum number of uploads to inspect.", "100")
    .action(fetchAction);
};
