import type { TranscriptResult } from "../types.js";

export type VideoMetadata = {
  channelTitle: string | undefined;
  publishedAt: string | undefined;
  title: string | undefined;
  url: string;
  videoId: string;
};

const DEFAULT_SENTENCES_PER_PARAGRAPH = 5;

const pad2 = (value: number): string => value.toString().padStart(2, "0");

const formatTimestamp = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
  }

  return `${pad2(minutes)}:${pad2(seconds)}`;
};

export const formatText = (transcript: TranscriptResult): string => transcript.text;

export const formatTimestamped = (transcript: TranscriptResult): string =>
  transcript.segments
    .map((segment) => `[${formatTimestamp(segment.offsetMs)}] ${segment.text}`)
    .join("\n");

export const formatParagraphs = (
  transcript: TranscriptResult,
  sentencesPerParagraph: number = DEFAULT_SENTENCES_PER_PARAGRAPH
): string => {
  const sentences = transcript.text
    .split(/(?<=[.!?])\s+/u)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
  const paragraphs: string[] = [];

  for (let index = 0; index < sentences.length; index += sentencesPerParagraph) {
    const chunk = sentences.slice(index, index + sentencesPerParagraph).join(" ");

    if (chunk.length > 0) {
      paragraphs.push(chunk);
    }
  }

  return paragraphs.join("\n\n");
};

const buildMetadataLines = (
  metadata: VideoMetadata,
  transcript: TranscriptResult
): string[] => {
  const lines: string[] = [];

  if (metadata.channelTitle) {
    lines.push(`**Channel:** ${metadata.channelTitle}`);
  }

  if (metadata.publishedAt) {
    lines.push(`**Published:** ${metadata.publishedAt}`);
  }

  lines.push(`**Video:** ${metadata.url}`);
  lines.push(`**Video ID:** \`${metadata.videoId}\``);

  if (transcript.language) {
    lines.push(`**Language:** ${transcript.language}`);
  }

  return lines;
};

export const formatMarkdownHeader = (
  metadata: VideoMetadata,
  transcript: TranscriptResult
): string => {
  const title = metadata.title ?? `YouTube transcript: ${metadata.videoId}`;
  const metadataLines = buildMetadataLines(metadata, transcript);

  return [`# ${title}`, "", ...metadataLines].join("\n");
};

export const formatMarkdownDocument = (args: {
  body: string;
  metadata: VideoMetadata;
  transcript: TranscriptResult;
}): string => {
  const header = formatMarkdownHeader(args.metadata, args.transcript);
  const body = args.body.trim();

  return `${header}\n\n---\n\n${body}\n`;
};
