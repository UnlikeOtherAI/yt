# Project Brief

## Goal

Build a Node.js CLI and npm package that accepts a YouTube channel and returns
up to a caller-defined number of video transcripts, while storing reusable
research data locally.

## Problem

Finding and collecting transcripts from a channel manually is slow and inconsistent. We need a repeatable way to:

- identify a channel from a URL, handle, or channel ID
- enumerate its uploaded videos
- fetch transcripts until a requested limit is reached
- return structured output that can be consumed by other tools
- transform raw transcripts into readable article-form output without losing
  facts, opinions, examples, or coverage
- avoid redoing work that has already been scraped and stored locally

## Primary User Story

As a user, I want to provide a YouTube channel and a transcript limit so I can quickly retrieve recent transcripts without manual video-by-video work.

## Agent Workflow Priority

This tool is intended to be consumed by agents as part of automated research
workflows. That means the CLI contract must be stable, machine-readable, and
fully self-describing through command help.

## V1 Scope

- accept channel input as `@handle`, channel URL, or channel ID
- accept a numeric transcript limit
- ship as a publishable npm package with a CLI binary
- resolve the channel to its uploads playlist
- iterate through uploaded videos in reverse chronological order
- fetch transcripts for videos where transcripts are available
- persist channels, videos, transcripts, and scrape metadata to local SQLite
- stop when the requested number of successful transcripts has been collected
- expose `--help` at the root command and every subcommand level
- return structured JSON output suitable for agent consumption
- support an article-generation stage that rewrites transcripts into coherent
  prose while preserving all substantive information
- support delta sync so repeated runs only fetch new or missing data
- support a separate metrics refresh flow for view-count history
- support channel lifecycle commands to add, untrack, and remove channels
- support subscriber tracking at the channel level over time

## Non-Goals For V1

- browser UI
- user accounts
- analytics dashboards
- multi-platform support outside YouTube

Plain lossy summarisation is also a non-goal. The generation stage should be a
coverage-preserving transformation, not a short summary.

## Product Rules

- `limit` means successful transcripts returned, not videos inspected
- the tool must expose clear help text for every command, subcommand, and flag
- the primary interface is the CLI, not internal undocumented modules
- videos without accessible transcripts are skipped
- the tool should report skipped videos and failure reasons where possible
- local SQLite storage is the system of record for previously scraped data
- repeated syncs must check local state first and only fetch the delta
- output must be deterministic for a given channel snapshot and configuration
- machine-readable output must go to `stdout`; human logs and diagnostics must
  go to `stderr`
- article generation must preserve facts, opinions, examples, caveats, and
  ordering context from the source transcript
- timestamps may be removed from article output, but timestamped source segments
  must remain available in the machine-readable result
- view history must be stored as time-series data so popularity can be tracked
  over time
- tracked channels must support an active/inactive state without deleting
  historical data
- channel subscriber history must be stored as time-series data so post-video
  bumps can be analysed later

## Success Criteria

- a user can run one command and retrieve transcripts from a public channel
- the tool handles common channel input formats without manual normalization
- failures on individual videos do not fail the entire run
- the output is structured enough for downstream processing
- an agent can discover usage from `--help` alone without opening source files
- the package can be installed and executed from npm-compatible environments
- article output is more readable than the source transcript while maintaining
  source coverage
- daily reruns avoid reprocessing already-scraped videos
- historical view snapshots can be used later for charts and trend analysis
- historical subscriber snapshots can be used later to correlate channel growth
  with publishing activity

## Known Constraints

- the official YouTube Data API is suitable for channel and video discovery
- transcript retrieval for public third-party videos may require an unofficial transcript source
- transcript availability is not guaranteed for every video
- YouTube rate limiting and anti-abuse controls must be respected
- npm package naming may require a scoped package name even if the repository is
  simply `yt`
- long transcripts may need chunked generation and coverage verification to
  avoid dropping information
- daily popularity history depends on periodic refresh jobs being run
- channel subscriber history depends on periodic refresh jobs being run
