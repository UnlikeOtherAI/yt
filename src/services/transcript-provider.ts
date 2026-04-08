import { join } from "node:path";

import { FsCache, fetchTranscript } from "youtube-transcript-plus";
import {
  YoutubeTranscriptDisabledError,
  YoutubeTranscriptNotAvailableError,
  YoutubeTranscriptNotAvailableLanguageError,
  YoutubeTranscriptTooManyRequestError,
  YoutubeTranscriptVideoUnavailableError
} from "youtube-transcript-plus";

import { FailureRecord, TranscriptResult } from "../types.js";

const cacheTtlMs = 24 * 60 * 60 * 1000;

const userAgent =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36";

export class TranscriptProvider {
  readonly #cache: FsCache;

  public constructor(dataDir: string) {
    this.#cache = new FsCache(join(dataDir, "transcript-cache"), cacheTtlMs);
  }

  public async fetch(videoId: string): Promise<TranscriptResult> {
    const transcript = await fetchTranscript(videoId, {
      cache: this.#cache,
      userAgent
    });

    const segments = transcript.map((segment) => ({
      durationMs: Math.round(segment.duration * 1000),
      offsetMs: Math.round(segment.offset * 1000),
      text: segment.text
    }));

    return {
      language: transcript[0]?.lang ?? null,
      segments,
      text: segments.map((segment) => segment.text).join(" ").trim()
    };
  }

  public toFailure(error: unknown, videoId: string): FailureRecord {
    if (error instanceof YoutubeTranscriptDisabledError) {
      return {
        code: "TRANSCRIPT_DISABLED",
        message: error.message,
        retryable: false,
        stage: "transcript-fetch",
        videoId
      };
    }

    if (error instanceof YoutubeTranscriptNotAvailableError) {
      return {
        code: "TRANSCRIPT_UNAVAILABLE",
        message: error.message,
        retryable: false,
        stage: "transcript-fetch",
        videoId
      };
    }

    if (error instanceof YoutubeTranscriptNotAvailableLanguageError) {
      return {
        code: "TRANSCRIPT_LANGUAGE_UNAVAILABLE",
        message: error.message,
        retryable: false,
        stage: "transcript-fetch",
        videoId
      };
    }

    if (error instanceof YoutubeTranscriptTooManyRequestError) {
      return {
        code: "TRANSCRIPT_RATE_LIMITED",
        message: error.message,
        retryable: true,
        stage: "transcript-fetch",
        videoId
      };
    }

    if (error instanceof YoutubeTranscriptVideoUnavailableError) {
      return {
        code: "VIDEO_UNAVAILABLE",
        message: error.message,
        retryable: false,
        stage: "transcript-fetch",
        videoId
      };
    }

    return {
      code: "TRANSCRIPT_FETCH_FAILED",
      message: error instanceof Error ? error.message : "Unknown transcript error.",
      retryable: false,
      stage: "transcript-fetch",
      videoId
    };
  }
}
