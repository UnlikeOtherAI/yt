import { AppError, EXIT_CODE } from "../errors.js";

const channelUrlPattern = /^https?:\/\/(?:www\.)?youtube\.com\//iu;
const directChannelPattern = /^UC[\w-]{20,}$/u;

export type ChannelInput =
  | { kind: "channelId"; value: string }
  | { kind: "customUrl"; value: string }
  | { kind: "handle"; value: string }
  | { kind: "username"; value: string };

export const parseChannelInput = (input: string): ChannelInput => {
  const value = input.trim();

  if (value.length === 0) {
    throw new AppError("A channel value is required.", EXIT_CODE.usageError);
  }

  if (directChannelPattern.test(value)) {
    return { kind: "channelId", value };
  }

  if (value.startsWith("@")) {
    return { kind: "handle", value };
  }

  if (channelUrlPattern.test(value)) {
    const url = new URL(value);
    const segments = url.pathname.split("/").filter(Boolean);
    const first = segments[0];
    const second = segments[1];

    if (first?.startsWith("@")) {
      return { kind: "handle", value: first };
    }

    if (first === "channel" && second) {
      return { kind: "channelId", value: second };
    }

    if (first === "user" && second) {
      return { kind: "username", value: second };
    }

    if (first === "c" && second) {
      return { kind: "customUrl", value: second };
    }
  }

  return { kind: "customUrl", value };
};
