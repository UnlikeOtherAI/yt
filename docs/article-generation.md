# Article Generation

## Goal

Convert transcripts into readable article-form text without losing substantive
information from the source.

This is not standard summarisation. The objective is to preserve:

- factual claims
- opinions
- examples
- caveats
- reasoning chains
- notable phrasing where it materially changes meaning

## Output Principle

The article should be easier to read than a timestamped transcript, but it must
not collapse the source into a shorter opinion-less summary.

Readable structure is allowed:

- paragraphs
- headings
- subheadings
- quoted sections where appropriate
- reordered sentence flow inside a local section when meaning is preserved

What must not happen:

- dropping minor examples because they seem less important
- flattening strong opinions into neutral language
- removing uncertainty, caveats, or hedging
- merging separate arguments into one vague statement

## Required Product Behavior

- keep the raw transcript and timestamped segments in the structured output
- produce article output as an additional field, not a replacement
- emit a coverage report that explains whether anything was compressed,
  transformed, or flagged as risky
- expose explicit partial-failure states when coverage checks do not pass

## Recommended Pipeline

### 1. Normalize Transcript

- clean obvious transcript noise
- preserve segment ordering
- preserve speaker changes if recoverable
- preserve timestamps in the source representation

### 2. Chunk The Transcript

Long transcripts should not be rewritten in one model call.

Chunking goals:

- stay inside token limits
- avoid losing mid-transcript detail
- preserve local context between adjacent chunks

Recommended approach:

- split by transcript segments
- target chunk sizes by tokens, not lines
- overlap adjacent chunks slightly for continuity

### 3. Transform Each Chunk

Each chunk should be rewritten into cleaner prose with strict instructions:

- do not omit any claim, opinion, example, or caveat
- do not invent connective facts
- retain uncertainty and emphasis
- remove timestamp noise from prose

### 4. Merge Into An Article

- combine chunk outputs into one article
- normalize headings and transitions
- avoid duplicate content introduced by overlap
- preserve chronological or argumentative flow unless a different ordering is
  explicitly better and still faithful

### 5. Coverage Verification

Coverage verification is mandatory.

Use a second pass to compare source transcript chunks against the generated
article and flag:

- missing claims
- missing examples
- softened opinions
- dropped caveats
- factual drift

If coverage verification fails:

- report the failure
- keep the raw transcript output
- optionally emit the best-effort article marked as incomplete

## LLM Configuration

Article generation requires one of the following in `~/.yt/.env`:

**Gemini (default)**

```
GEMINI_API_KEY=your-key-here
GEMINI_MODEL=gemini-3.1-pro-preview   # optional, this is the default
```

**OpenAI-compatible (Minimax, OpenAI, etc.)**

```
OPENAI_BASE_URL=https://api.minimax.chat/v1
OPENAI_API_KEY=your-key-here
OPENAI_MODEL=minimax-m1-mini-remote
```

`OPENAI_BASE_URL` takes precedence over `GEMINI_API_KEY` when both are set.

Any provider that implements the `/chat/completions` endpoint can be used.

## Suggested Model Usage

- default model: `gemini-3.1-pro-preview`
- one model call for chunk transformation
- one model call for merge/cleanup if needed
- one verification call for coverage checking

Do not trust a single-pass rewrite for long transcripts.

## Prompt Requirements

The rewrite prompt must be framed as a fidelity-preservation task, not a
summary task.

The system instruction should explicitly forbid:

- dropping any factual detail
- dropping or softening opinions
- removing examples, caveats, jokes, or speculation
- compressing multiple claims into one vague sentence
- adding outside context or inferred facts

The instruction should also explicitly require:

- preserving informational density
- preserving stance and tone
- preserving ambiguity where the speaker is ambiguous
- returning article prose only

## CLI Implications

Suggested command:

```text
yt articles generate --channel <value> --limit <number> --json
```

Suggested output fields:

- `transcriptText`
- `segments`
- `article`
- `coverageReport`
- `generationModel`
- `generationStatus`

## Risks

- long transcripts can exceed practical model context
- one-pass generation can silently drop detail
- aggressive stylistic rewriting can distort meaning
- verification itself can miss subtle omissions

Because of that, the system should treat fidelity as something to verify, not
assume.
