import { Command } from "commander";

import { createAppContext } from "../app-context.js";
import { printJson } from "../utils/json-output.js";
import { parsePositiveInteger, writeHuman } from "./command-helpers.js";

type SyncOptions = {
  channel?: string;
  concurrency: string;
  json?: boolean;
  limit: string;
  maxVideosInspected: string;
};

const syncAction = async (options: SyncOptions) => {
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
      channel: options.channel ?? null,
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

  writeHuman(`Synced ${String(result.videos.length)} videos.`);
};

export const registerResearchCommand = (program: Command) => {
  program
    .command("research")
    .description("Sync YouTube research data into local SQLite storage.")
    .command("sync")
    .description("Sync tracked channels or one specific channel into local storage.")
    .option("--channel <value>", "Channel URL, @handle, username URL, or channel ID.")
    .option("--concurrency <number>", "Concurrent transcript fetches.", "2")
    .option("--json", "Write structured JSON to stdout.")
    .option("--limit <number>", "Maximum number of ready transcripts to return.", "25")
    .option("--max-videos-inspected <number>", "Maximum number of uploads to inspect.", "100")
    .action(syncAction);
};
