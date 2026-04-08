# CLI Contract

## Purpose

The CLI is the primary product surface. Agents and humans must be able to
discover usage through help output without reading source code or markdown.

## Packaging

- implementation target: Node.js CLI
- distribution target: npm package
- default package assumption: `@unlikeotherai/yt`
- default binary assumption: `yt`
- local development package manager: `pnpm`

## Help-First Requirements

The following must exist and be maintained:

- root help
- subcommand help
- flag help
- examples in help output
- defaults in help output where applicable

Minimum commands:

- `yt --help`
- `yt channels --help`
- `yt channels add --help`
- `yt channels untrack --help`
- `yt channels remove --help`
- `yt transcripts --help`
- `yt transcripts fetch --help`
- `yt research --help`
- `yt research sync --help`
- `yt metrics --help`
- `yt metrics refresh --help`
- `yt articles --help`
- `yt articles generate --help`

Local development convenience:

- `pnpm help`
- optional `npm run help`
- optional `yarn help`

Package-manager scripts are convenience wrappers only. The canonical interface
is the CLI binary and its subcommands.

## Output Modes

### Human Mode

- default for interactive use
- concise summary to stderr or stdout only when JSON mode is not enabled

### JSON Mode

- explicit flag such as `--json`
- stdout contains JSON only
- stderr contains logs, warnings, and diagnostics only
- output schema must be versioned

## Exit Codes

- `0`: completed successfully
- `1`: fatal runtime or configuration error
- `2`: invalid usage or validation error
- `3`: completed with partial results but below requested target
- `4`: upstream dependency failure with no usable results

## Initial Command Tree

```text
yt
  channels
    add
    untrack
    remove
  research
    sync
  metrics
    refresh
  transcripts
    fetch
  articles
    generate
```

Initial fetch command:

```text
yt transcripts fetch --channel <value> --limit <number> [--json]
```

Initial sync command:

```text
yt research sync --channel <value> [--json]
```

Initial metrics refresh command:

```text
yt metrics refresh --channel <value> [--json]
```

Initial channel lifecycle commands:

```text
yt channels add --channel <value> [--json]
yt channels untrack --channel <value> [--json]
yt channels remove --channel <value> [--json]
```

## Required Flags For `fetch`

- `--channel <value>`
- `--limit <number>`
- `--json`
- `--max-videos-inspected <number>`
- `--timeout-ms <number>`
- `--concurrency <number>`
- `--log-level <value>`

Optional later:

- `--language <code>`
- `--published-after <iso-date>`
- `--data-dir <path>`

## Required Flags For `sync`

- `--channel <value>`
- `--json`
- `--limit <number>`
- `--max-videos-inspected <number>`
- `--timeout-ms <number>`
- `--concurrency <number>`
- `--data-dir <path>`
- `--log-level <value>`

## Required Flags For `metrics refresh`

- `--channel <value>`
- `--json`
- `--data-dir <path>`
- `--log-level <value>`

## Required Flags For `channels add`

- `--channel <value>`
- `--json`
- `--data-dir <path>`
- `--log-level <value>`

## Required Flags For `channels untrack`

- `--channel <value>`
- `--json`
- `--data-dir <path>`
- `--log-level <value>`

## Required Flags For `channels remove`

- `--channel <value>`
- `--json`
- `--data-dir <path>`
- `--log-level <value>`
- `--yes`

## JSON Result Shape

```json
{
  "schemaVersion": "1",
  "request": {
    "channel": "@example",
    "limit": 25,
    "dataDir": "/Users/example/.yt"
  },
  "result": {
    "completed": true,
    "successfulCount": 25,
    "videosInspected": 41,
    "skippedCount": 16,
    "nextPageToken": null,
    "databasePath": "/Users/example/.yt/yt.sqlite",
    "transcripts": [],
    "failures": []
  }
}
```

## Failure Object Shape

```json
{
  "videoId": "abc123",
  "stage": "transcript-fetch",
  "code": "TRANSCRIPT_UNAVAILABLE",
  "message": "Transcript not available for this video.",
  "retryable": false
}
```

## Stability Rules

- do not make undocumented breaking CLI changes
- do not change JSON field names without a schema version change
- do not print logs to stdout in JSON mode
- do not rely on hidden environment behavior
- do not bypass local persistence rules in sync commands
