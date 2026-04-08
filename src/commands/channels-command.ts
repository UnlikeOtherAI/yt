import { Command } from "commander";

import { createAppContext } from "../app-context.js";
import { printJson } from "../utils/json-output.js";
import { CommonOptions, writeHuman } from "./command-helpers.js";

type ChannelOptions = CommonOptions & {
  channel: string;
  yes?: boolean;
};

const addAction = async (options: ChannelOptions) => {
  const context = createAppContext();
  const channel = await context.channelLifecycleService.add(options.channel);
  const result = { channel, databasePath: context.config.databasePath, schemaVersion: "1" };

  if (options.json) {
    printJson(result);
    return;
  }

  writeHuman(`Added channel ${channel.channelName} (${channel.channelId}).`);
};

const removeAction = async (options: ChannelOptions) => {
  if (!options.yes) {
    throw new Error("channels remove requires --yes.");
  }

  const context = createAppContext();
  context.channelLifecycleService.remove(options.channel);
  const result = {
    channel: options.channel,
    databasePath: context.config.databasePath,
    removed: true,
    schemaVersion: "1"
  };

  if (options.json) {
    printJson(result);
    return;
  }

  writeHuman(`Removed channel ${options.channel} from local storage.`);
};

const untrackAction = async (options: ChannelOptions) => {
  const context = createAppContext();
  context.channelLifecycleService.untrack(options.channel);
  const result = {
    channel: options.channel,
    databasePath: context.config.databasePath,
    schemaVersion: "1",
    tracked: false
  };

  if (options.json) {
    printJson(result);
    return;
  }

  writeHuman(`Untracked channel ${options.channel}. Historical data was preserved.`);
};

export const registerChannelsCommand = (program: Command) => {
  const channels = program.command("channels").description("Manage tracked YouTube channels.");

  channels
    .command("add")
    .description("Add a YouTube channel to local tracking.")
    .requiredOption("--channel <value>", "Channel URL, @handle, username URL, or channel ID.")
    .option("--json", "Write structured JSON to stdout.")
    .action(addAction);

  channels
    .command("remove")
    .description("Remove a YouTube channel and all local research data.")
    .requiredOption("--channel <value>", "Canonical channel ID.")
    .option("--json", "Write structured JSON to stdout.")
    .option("--yes", "Confirm destructive channel removal.")
    .action(removeAction);

  channels
    .command("untrack")
    .description("Stop tracking a YouTube channel while preserving local history.")
    .requiredOption("--channel <value>", "Canonical channel ID.")
    .option("--json", "Write structured JSON to stdout.")
    .action(untrackAction);
};
