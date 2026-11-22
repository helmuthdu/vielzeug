# AGENTS.md: scripts

> Read when: editing `scripts/` tooling or the shared `scripts/lib/` primitives.

Repo tooling: release/publish automation, git worktree helper, generated-doc sync, and REPL
codegen/validation. Not a published package: consumed by `bun` scripts, CI workflows, and
directly via `bun scripts/...` (both `.mjs` and `.ts`: Bun runs plain JS and TypeScript natively).

## Shared tools

- `lib/cli.mjs`, `lib/marker-sync.mjs`, `lib/packages.mjs`, `lib/change-files.mjs`, and `lib/validator.ts` hold shared command, generation, package-scan, change-file, and validator behavior. Reuse these instead of maintaining parallel implementations.
- `release/` contains the release commands; start at `release/cli.mjs`. Other scripts document their own inputs and behavior in their source headers.
- `bun run` lists root commands from `package.json`; there is no separate script router.

## Local contracts

- Bun is the configured runtime. Keep scripts import-safe: filesystem, network, and subprocess effects belong behind an `isMain` guard so modules remain usable by tests and other scripts.
- Full-repository package scans in `lib/packages.mjs` log and skip malformed unrelated manifests; operations targeting one named package should still fail clearly.
- Preserve error causes when reporting script failures, set `process.exitCode` instead of terminating early, and read environment flags inside the function that uses them.
- `.ts` scripts use Bun's TypeScript support. If a checked `.ts` file imports `.mjs` logic, keep its `.d.mts` declaration aligned with that module.
- `parseArgs()` accepts `--flag=value` or a bare boolean flag, not `--flag value`.

## Adding scripts

- Add a root `package.json` script and tests under `scripts/__tests__/` for new top-level tools. Reuse shared helpers for CLI handling, generation, package scans, and diagnostics.
- List hand-authored files under `.agents/` in `.agents/README.md`; `bun run check:ai-data` validates repository references.

## Verification

- Tests: `bun x vitest run scripts/`.
- AI metadata and reference integrity: `bun run check:ai-data`.
- `scripts/` is Biome-ignored; tests and a direct smoke run (`bun scripts/<file>.mjs` or `.ts`) are its checks.
