# Project Brief

## Goal

Build a tool that accepts a YouTube channel and returns up to a caller-defined number of video transcripts.

## Problem

Finding and collecting transcripts from a channel manually is slow and inconsistent. We need a repeatable way to:

- identify a channel from a URL, handle, or channel ID
- enumerate its uploaded videos
- fetch transcripts until a requested limit is reached
- return structured output that can be consumed by other tools

## Primary User Story

As a user, I want to provide a YouTube channel and a transcript limit so I can quickly retrieve recent transcripts without manual video-by-video work.

## V1 Scope

- accept channel input as `@handle`, channel URL, or channel ID
- accept a numeric transcript limit
- resolve the channel to its uploads playlist
- iterate through uploaded videos in reverse chronological order
- fetch transcripts for videos where transcripts are available
- stop when the requested number of successful transcripts has been collected
- return structured JSON output

## Non-Goals For V1

- browser UI
- user accounts
- transcript summarisation
- long-term storage beyond basic local caching
- analytics dashboards
- multi-platform support outside YouTube

## Product Rules

- `limit` means successful transcripts returned, not videos inspected
- videos without accessible transcripts are skipped
- the tool should report skipped videos and failure reasons where possible
- output must be deterministic for a given channel snapshot and configuration

## Success Criteria

- a user can run one command and retrieve transcripts from a public channel
- the tool handles common channel input formats without manual normalization
- failures on individual videos do not fail the entire run
- the output is structured enough for downstream processing

## Known Constraints

- the official YouTube Data API is suitable for channel and video discovery
- transcript retrieval for public third-party videos may require an unofficial transcript source
- transcript availability is not guaranteed for every video
- YouTube rate limiting and anti-abuse controls must be respected
