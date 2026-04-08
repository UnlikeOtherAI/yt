# Engineering Standards

## Purpose

This repository should enforce strict standards in code, structure, and
tooling. Guidance is not enough. The defaults should be enforced through lint,
tests, and CI.

## Tooling Baseline

- TypeScript with `strict: true`
- ESLint flat config
- Prettier for formatting
- Vitest for tests
- CI must run lint, typecheck, test, and build

## ESLint Stack

Minimum baseline:

- `@eslint/js`
- `typescript-eslint` with type-aware strict rules
- `eslint-plugin-import-x`
- `eslint-plugin-n`
- `eslint-plugin-promise`
- `eslint-plugin-unicorn`
- `eslint-plugin-sonarjs`

Optional only if justified by implementation needs:

- `eslint-plugin-security`
- `eslint-plugin-perfectionist`

## Enforced Rules

- no `any` except at a documented external boundary
- no default exports
- no unused exports
- no circular imports
- no floating promises
- no implicit `console` usage outside the logger boundary
- no magic strings for error codes
- no undocumented environment variables

## File Size Limits

These are hard limits unless there is a documented exception.

- command files: 200 lines max
- service files: 250 lines max
- adapter files: 250 lines max
- utility files: 150 lines max
- type definition files: 150 lines max
- test files: 300 lines max

If a file exceeds its limit, split the responsibility. Do not add waivers
casually.

## Complexity Limits

- max cyclomatic complexity: 10
- max function length: 60 lines
- max parameters per function: 4
- max nesting depth: 3
- max public exports per file: 5

These should be lint-enforced where practical and reviewed strictly where not.

## Structural Rules

- one command module per subcommand
- one adapter per external dependency boundary
- business logic must not live in CLI entrypoints
- parsing, orchestration, and external I/O must be separated
- cache logic must not be mixed into transcript provider logic

## Testing Expectations

- unit tests for channel normalization
- unit tests for pagination logic
- unit tests for output schema assembly
- unit tests for failure classification
- integration tests for the CLI surface
- snapshot tests only for stable help text and JSON contracts

## Help Text Quality

Help text is part of the product surface and must be tested.

- root help snapshot
- subcommand help snapshot
- examples included in help output
- defaults shown for bounded controls

## CI Policy

The build must fail when any of the following fail:

- lint
- typecheck
- tests
- build

No merge should be considered acceptable if lint is failing.
