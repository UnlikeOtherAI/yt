# Technology And Architecture

## Architecture Direction

Use a small TypeScript Node.js CLI first. Do not build a web app yet. The initial value is in reliable retrieval, not interface work.

## Core Stack

- package manager: `pnpm`
- runtime: Node.js 22 LTS
- language: TypeScript
- command interface: `commander`
- validation: `zod`
- HTTP client: native `fetch`
- concurrency control: `p-limit`
- logging: `pino`
- tests: `vitest`
- linting: `eslint`
- formatting: `prettier`

## External Integrations

### YouTube Discovery

Use the official YouTube Data API v3 for:

- channel resolution
- uploads playlist lookup
- playlist item pagination
- basic video metadata

### Transcript Retrieval

Use a dedicated transcript library for transcript extraction from public videos. This is separate from the official discovery flow because public transcript download is not reliably covered by the standard Data API for channels we do not control.

Initial choice:

- `youtube-transcript-plus`

If that proves unstable, replace only the transcript adapter, not the rest of the pipeline.

## Proposed Flow

1. Accept channel input and `limit`.
2. Normalize the channel input.
3. Resolve the input to a canonical YouTube channel ID.
4. Fetch the channel uploads playlist ID.
5. Page through uploads in reverse chronological order.
6. Attempt transcript retrieval for each video.
7. Collect successful transcripts until the requested limit is reached.
8. Return JSON results and execution metadata.

## Output Shape

Each transcript result should contain:

- `channelId`
- `channelTitle`
- `videoId`
- `videoTitle`
- `videoUrl`
- `publishedAt`
- `language`
- `transcriptText`
- `segments`

Each run should also include:

- `requestedLimit`
- `successfulCount`
- `videosInspected`
- `skippedCount`
- `failures`

## Project Structure

```text
docs/
  brief.md
  technology.md
src/
  cli/
  lib/
  adapters/
tests/
```

## Module Boundaries

### `src/cli`

- parse command arguments
- validate user input
- call the application service
- print structured output

### `src/lib`

- application orchestration
- channel resolution
- YouTube API access
- pagination
- result assembly

### `src/adapters`

- transcript provider abstraction
- concrete transcript provider implementation
- local cache implementation if added

## Configuration

Environment variables expected:

- `YOUTUBE_API_KEY`
- `LOG_LEVEL`

Optional later:

- `TRANSCRIPT_CONCURRENCY`
- `CACHE_DIR`

## Error Handling

- fail fast on invalid input
- fail fast when `YOUTUBE_API_KEY` is missing
- continue on per-video transcript failures
- return machine-readable failure details
- avoid hidden fallbacks

## Caching

V1 should allow a minimal local cache keyed by `videoId` plus `language`. This is useful for:

- reducing repeated transcript fetches
- lowering remote calls during development
- improving reliability when rerunning the same request

SQLite is acceptable later, but file-based JSON cache is enough to start.

## Linting And Quality Rules

These are non-negotiable for this repository:

- TypeScript strict mode enabled
- ESLint must run in CI
- build must not pass if lint fails
- no `any` without a justified boundary
- no duplicate integration logic across modules
- root-cause fixes only, no patch-on-patch workarounds

## Recommended Initial Milestones

1. Scaffold the CLI project and strict TypeScript config.
2. Implement channel normalization and resolution.
3. Implement uploads playlist traversal.
4. Implement transcript adapter and failure handling.
5. Add JSON output and test coverage for core parsing logic.
6. Add caching only after the retrieval pipeline is stable.

## Deferred Decisions

- whether CSV export is needed
- whether we need a local database instead of file caching
- whether to support transcript language selection in v1
- whether to add an HTTP API after the CLI proves stable
