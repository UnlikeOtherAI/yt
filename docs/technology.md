# Technology And Architecture

## Architecture Direction

Use a small TypeScript Node.js CLI first and publish it as an npm package. Do
not build a web app yet. The initial value is in reliable retrieval, not
interface work.

## Core Stack

- package manager: `pnpm`
- runtime: Node.js 22 LTS
- language: TypeScript
- command interface: `commander`
- validation: `zod`
- environment loading: `dotenv`
- HTTP client: native `fetch`
- database: SQLite via `better-sqlite3`
- concurrency control: `p-limit`
- logging: `pino`
- LLM provider: Gemini via `@google/genai`
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

### Article Generation

Use Gemini through the Generative Language API for transcript-to-article
transformation.

Rules:

- generation is a post-processing stage after transcript retrieval
- raw transcript segments remain part of the structured result
- the generator must optimize for coverage preservation, not brevity
- timestamps may be omitted from article prose but must remain available in the
  source payload

## Distribution

Development package manager:

- `pnpm`

Distribution target:

- publish to npm as a CLI package
- default assumption: scoped package name such as `@unlikeotherai/yt`
- expose a short binary name such as `yt`

Consumer expectations:

- usable via installed binary
- usable via `npx`
- usable via package manager script passthrough during local development

## CLI Contract

The CLI must be help-first and self-describing.

Minimum required help surfaces:

- `yt --help`
- `yt channels --help`
- `yt channels add --help`
- `yt channels untrack --help`
- `yt channels remove --help`
- `yt transcripts --help`
- `yt transcripts fetch --help`
- `pnpm help` for local development convenience

Rules:

- every command and subcommand must implement `--help`
- every flag must have a description, type, and default where applicable
- invalid input must suggest the nearest valid command or flag
- JSON mode must be explicit and documented
- stdout is reserved for structured output
- stderr is reserved for logs, warnings, and diagnostics

Initial command shape:

```text
yt transcripts fetch --channel <value> --limit <number> [--json]
```

Planned article command shape:

```text
yt articles generate --channel <value> --limit <number> [--json]
```

Planned sync command shapes:

```text
yt research sync --channel <value> [--json]
yt metrics refresh --channel <value> [--json]
yt channels add --channel <value> [--json]
yt channels untrack --channel <value> [--json]
yt channels remove --channel <value> [--json]
```

## Proposed Flow

1. Accept channel input and `limit`.
2. Normalize the channel input.
3. Resolve the input to a canonical YouTube channel ID.
4. Fetch the channel uploads playlist ID.
5. Page through uploads in reverse chronological order.
6. Attempt transcript retrieval for each video.
7. Check local SQLite state and skip videos already stored unless refresh is
   explicitly requested.
8. Persist channel, video, transcript, and scrape metadata.
9. Collect successful transcripts until the requested limit is reached.
10. Optionally transform each transcript into article-form output with Gemini.
11. Return JSON results and execution metadata.

For scheduled operation:

- tracked channels are synced from local storage state
- metrics refresh captures snapshot date and exact snapshot time
- multi-run days are supported through timestamped metrics history

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
- `article`
- `coverageReport`
- `scrapedAt`
- `viewCount`

Each run should also include:

- `schemaVersion`
- `requestedLimit`
- `successfulCount`
- `videosInspected`
- `skippedCount`
- `failures`
- `completed`
- `nextPageToken`

Failure objects should be structured, not free text. Minimum shape:

- `videoId`
- `stage`
- `code`
- `message`
- `retryable`

## Project Structure

```text
docs/
  brief.md
  cli-contract.md
  data-model.md
  engineering-standards.md
  technology.md
src/
  cli/
  lib/
  adapters/
  db/
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

### `src/db`

- schema creation and migrations
- query modules for channels, videos, transcripts, and view history
- idempotent upsert helpers

## Configuration

Environment variables expected:

- `YOUTUBE_API_KEY`
- `GEMINI_API_KEY`
- `LOG_LEVEL`

Optional later:

- `TRANSCRIPT_CONCURRENCY`
- `YT_DATA_DIR`

## Error Handling

- fail fast on invalid input
- fail fast when `YOUTUBE_API_KEY` is missing
- continue on per-video transcript failures
- return machine-readable failure details
- avoid hidden fallbacks
- use explicit process exit codes
- never mix JSON payloads with log lines on stdout
- apply per-request timeouts and bounded retries

Generation-specific rules:

- fail clearly if `GEMINI_API_KEY` is missing when article generation is
  requested
- separate transcript retrieval failures from article generation failures
- preserve transcript output even if article generation fails

## Operational Limits

The crawl must be bounded even when `limit` refers to successful transcripts.

Required controls:

- `maxVideosInspected`
- per-video timeout
- transcript fetch concurrency limit
- retry budget for transient API failures

Default behavior should prefer predictability over completeness.

Generation must also be bounded:

- chunk long transcripts before model submission
- cap generation retries
- emit explicit partial-generation state when coverage checks fail

## Persistence

The tool should create a data directory in the home directory:

- default path: `~/.yt/`
- default database path: `~/.yt/yt.sqlite`

SQLite is not optional for the workflow you described. It is the local source
of truth for:

- known channels
- known videos
- transcript content
- scrape state
- view-count history

Required behavior:

- use idempotent upserts
- avoid duplicate video rows by `videoId`
- avoid duplicate channel rows by `channelId`
- keep view history append-only by snapshot date
- keep channel subscriber history append-only by snapshot time
- support delta sync by checking the existing local state first

See `docs/data-model.md` for the schema direction.

## Linting And Quality Rules

These are non-negotiable for this repository:

- TypeScript strict mode enabled
- ESLint must run in CI
- build must not pass if lint fails
- no `any` without a justified boundary
- no duplicate integration logic across modules
- root-cause fixes only, no patch-on-patch workarounds
- file size and complexity limits must be enforced by lint, not left as guidance

See `docs/engineering-standards.md` for the specific limits.

## Recommended Initial Milestones

1. Scaffold the CLI project and strict TypeScript config.
2. Implement the help-first command tree and stable JSON contract.
3. Implement channel normalization and resolution.
4. Implement SQLite schema, migrations, and idempotent upserts.
5. Implement uploads playlist traversal with bounded crawl controls.
6. Implement transcript adapter and failure handling.
7. Implement delta sync against the local database.
8. Implement the Gemini article-generation pipeline with coverage checks.
9. Implement a metrics refresh flow for view-history snapshots.
10. Implement channel add, untrack, and remove flows.
11. Implement subscriber-history snapshots at the channel level.
12. Add test coverage for parsing, persistence, output contracts, and error
    cases.

## Deferred Decisions

- whether CSV export is needed
- whether to support transcript language selection in v1
- whether to add an HTTP API after the CLI proves stable
