import { Command } from "commander";

import { createAppContext } from "../app-context.js";
import { printJson } from "../utils/json-output.js";
import { writeHuman } from "./command-helpers.js";

type MetricsOptions = {
  channel?: string;
  json?: boolean;
};

const refreshAction = async (options: MetricsOptions) => {
  const context = createAppContext();
  const result = await context.metricsRefreshService.refresh(options.channel);
  const payload = {
    request: {
      channel: options.channel ?? null,
      dataDir: context.config.dataDir
    },
    result: {
      ...result,
      databasePath: context.config.databasePath
    },
    schemaVersion: "1"
  };

  if (options.json) {
    printJson(payload);
    return;
  }

  writeHuman(`Refreshed metrics for ${result.channelCount} channel(s).`);
};

export const registerMetricsCommand = (program: Command) => {
  program
    .command("metrics")
    .description("Refresh stored YouTube popularity metrics.")
    .command("refresh")
    .description("Refresh video views and channel subscriber history.")
    .option("--channel <value>", "Canonical channel ID. Defaults to all tracked channels.")
    .option("--json", "Write structured JSON to stdout.")
    .action(refreshAction);
};
