import { Command } from "commander";

import { loadConfig } from "../config.js";
import { AppError, EXIT_CODE } from "../errors.js";
import { printJson } from "../utils/json-output.js";
import { YoutubeApi } from "../youtube/api.js";
import { parsePositiveInteger, writeHuman } from "./command-helpers.js";

type SearchOptions = {
  channel?: string;
  json?: boolean;
  maxResults: string;
  order: string;
  publishedAfter?: string;
  query: string;
};

const searchAction = async (options: SearchOptions) => {
  const config = loadConfig();

  if (!config.youtubeApiKey) {
    throw new AppError("YOUTUBE_API_KEY is required for search.", EXIT_CODE.runtimeError);
  }

  const api = new YoutubeApi(config.youtubeApiKey);
  const maxResults = parsePositiveInteger(options.maxResults, "max-results");

  if (maxResults > 50) {
    throw new AppError("max-results cannot exceed 50.", EXIT_CODE.usageError);
  }

  const results = await api.searchVideos({
    ...(options.channel ? { channelId: options.channel } : {}),
    maxResults,
    order: options.order,
    ...(options.publishedAfter ? { publishedAfter: options.publishedAfter } : {}),
    query: options.query
  });

  if (options.json) {
    printJson({ results, schemaVersion: "1" });
    return;
  }

  if (results.length === 0) {
    writeHuman("No results found.");
    return;
  }

  for (const result of results) {
    const line = [
      result.videoId,
      result.publishedAt.slice(0, 10),
      `[${result.channelTitle}]`,
      result.title
    ].join("  ");
    process.stdout.write(`${line}\n`);
  }

  writeHuman(`\n${String(results.length)} result(s). Cost: 100 quota units.`);
};

export const registerSearchCommand = (program: Command) => {
  program
    .command("search")
    .description("Search YouTube videos. Costs 100 quota units per call.")
    .requiredOption("-q, --query <text>", "Search query.")
    .option("--channel <channelId>", "Restrict to a specific channel ID.")
    .option("--max-results <number>", "Number of results (1-50).", "5")
    .option("--order <type>", "Sort order: relevance, date, rating, viewCount.", "date")
    .option("--published-after <date>", "ISO 8601 date, e.g. 2026-04-01T00:00:00Z.")
    .option("--json", "Write structured JSON to stdout.")
    .action(searchAction);
};
