# Release Task

## Use when

Prepare delivery artifacts, create change files, review commits, create pull requests, or diagnose release workflow behavior.

## Inputs

- `scope`
- `goal`

## Load

- `.ai/core/policy.md`
- `.ai/core/workspace.md`
- relevant `AGENTS.md` chain
- `.github/AGENTS.md` for workflow changes

## Preconditions

Never commit, push, tag, release, publish, rewrite history, or delete branches without explicit approval for that action.

## Flow

1. Confirm modified package scope and validation status.
2. For version-relevant package changes, create one scoped Rush change file per package using `scripts/rush-change.mjs`.
3. Review status, diff, and relevant history before proposing commit or pull request content.
4. Verify generated artifacts and release metadata are current.
5. Perform approved delivery action only after explicit confirmation.

## Rules

- Use `node scripts/rush-change.mjs <name> <patch|minor|major> "<message>"`; never use `rush change --bulk`.
- Treat docs changes as Codex release-relevant; Codex hook writes its change file automatically.
- Use conventional commit meaning for bump selection: `fix` patch, `feat` minor, breaking major.
- Keep publishing diagnostics in scripts and workflows; do not bypass release checks or trusted-publishing controls.

## Output

- `[DEFERRED] <artifact>: <reason>`
- `[BLOCKED] <approval or decision>`
