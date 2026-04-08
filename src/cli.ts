#!/usr/bin/env node

import { Command } from "commander";

import { registerArticlesCommand } from "./commands/articles-command.js";
import { registerChannelsCommand } from "./commands/channels-command.js";
import { registerMetricsCommand } from "./commands/metrics-command.js";
import { registerResearchCommand } from "./commands/research-command.js";
import { registerTranscriptsCommand } from "./commands/transcripts-command.js";
import { AppError, EXIT_CODE } from "./errors.js";

const program = new Command();

program
  .name("yt")
  .description("YouTube-first research ingestion CLI.")
  .showHelpAfterError()
  .showSuggestionAfterError();

registerChannelsCommand(program);
registerResearchCommand(program);
registerMetricsCommand(program);
registerTranscriptsCommand(program);
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
