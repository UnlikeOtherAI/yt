#!/usr/bin/env node

import { Command } from "commander";

import { registerArticlesCommand } from "./commands/articles-command.js";
import { registerChannelsCommand } from "./commands/channels-command.js";
import { registerMetricsCommand } from "./commands/metrics-command.js";
import { registerResearchCommand } from "./commands/research-command.js";
import { registerSearchCommand } from "./commands/search-command.js";
import { registerTranscriptsCommand } from "./commands/transcripts-command.js";
import { AppError, EXIT_CODE } from "./errors.js";

const program = new Command();

const CONFIG_HELP = `Configuration  (~/.yt/.env)

  LLM  (required for --format article / markdown):
    Gemini (default):
      GEMINI_API_KEY=your-key
      GEMINI_MODEL=gemini-3.1-pro-preview   (optional)

    OpenAI-compatible (Minimax, OpenAI, etc.):
      OPENAI_BASE_URL=https://api.minimax.chat/v1
      OPENAI_API_KEY=your-key
      OPENAI_MODEL=minimax-m1-mini-remote

    OPENAI_BASE_URL takes precedence over GEMINI_API_KEY when both are set.

  YouTube API  (required for channel commands):
    YOUTUBE_API_KEY=your-key

  Storage:
    YT_DATA_DIR=~/.yt   (optional, this is the default)

`;

program
  .name("yt")
  .description("YouTube-first research ingestion CLI.")
  .addHelpText("before", CONFIG_HELP)
  .showHelpAfterError()
  .showSuggestionAfterError();

registerChannelsCommand(program);
registerResearchCommand(program);
registerMetricsCommand(program);
registerTranscriptsCommand(program);
registerSearchCommand(program);
registerArticlesCommand(program);

program.command("help", { isDefault: false }).action(() => {
  program.outputHelp();
});

try {
  await program.parseAsync(process.argv);
} catch (error) {
  if (error instanceof AppError) {
    process.stderr.write(`${error.message}\n`);
    process.exit(error.exitCode);
  }

  if (error instanceof Error) {
    process.stderr.write(`${error.message}\n`);
    process.exit(EXIT_CODE.runtimeError);
  }

  process.stderr.write("Unknown runtime error.\n");
  process.exit(EXIT_CODE.runtimeError);
}
