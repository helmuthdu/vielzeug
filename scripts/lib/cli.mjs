/**
 * Shared primitives every CLI script in `scripts/` needs: "is this file being run directly",
 * "run a subprocess", and "split argv into positionals + flags". Extracted after these three
 * were independently copy-pasted (with subtly different bugs — e.g. flags that only accepted
 * `--x=y`, never `--x y`) across worktree.mjs, sync-catalogue.mjs, sync-workflow-docs.mjs, and
 * every scripts/release/*.mjs module. One implementation, one place to fix a bug in it.
 *
 * `cli.d.mts` next to this file is a hand-written type declaration for the `.ts` scripts that
 * import this module (currently just validate-repl.ts, for `isMain`/`parseArgs`) — tsc can't
 * infer types across a `.ts` -> `.mjs` import on its own. A `.ts` file that only needs `isMain`
 * should inline the one-line check instead of importing this module (see
 * generate-repl-registry.ts) — not worth a cross-language type contract for a single
 * three-token check. There's no automated check that `cli.d.mts` and this file stay in sync (a
 * deliberate low-risk-of-drift bet: this file's surface is 3 tiny functions, and enabling
 * `checkJs` repo-wide to generate the declaration automatically would typecheck every
 * `.mjs`/`.js` file in the whole monorepo, not just this one). If you change a function
 * signature here, update `cli.d.mts` in the same commit.
 */

import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/** True when this module was invoked directly (`node path/to/file.mjs`), not imported. */
export function isMain(moduleUrl) {
  return process.argv[1] === fileURLToPath(moduleUrl);
}

/**
 * Runs `cmd` and returns its stdout as a string by default (`stdio: 'pipe'`, implicit in
 * `execFileSync`). Two other IO postures cover every real need across these scripts:
 *   - `inherit: true`  — share this process's actual stdio. Required for anything interactive
 *     (an npm 2FA prompt, a browser-trust flow) or where the user should see output live
 *     (git/gh/rush commands) — at the cost of not being able to inspect the output afterwards.
 *   - `quiet: true`     — discard stdio entirely (`stdio: 'ignore'`). For a probe whose exit
 *     code is the only thing that matters (e.g. "does this git tag exist") where even the
 *     command's own error output would be noise on a expected-to-fail check.
 */
export function run(cmd, args, { cwd, inherit = false, quiet = false } = {}) {
  const stdio = quiet ? 'ignore' : inherit ? 'inherit' : undefined;
  return execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio });
}

/**
 * Splits argv into positional arguments and flags: `--flag=value` for anything that takes a
 * value, bare `--flag` for booleans. Deliberately does *not* support a space-separated
 * `--flag value` form — that requires guessing whether the next bare token is the flag's value
 * or the next positional (e.g. `--interactive packages/ore` is genuinely ambiguous), and every
 * real flag in this repo's scripts is either boolean or short enough that `=` isn't a burden.
 * One unambiguous rule beats a heuristic that's right most of the time.
 *
 * A literal `--` token is dropped, not parsed as a flag named `""`. `pnpm run <script> -- --x`
 * forwards that `--` into the script's own argv verbatim (confirmed empirically — Node only
 * strips a `--` it sees as its *own* first flag-parsing token, not one appearing later in
 * argv) — every documented `pnpm ... -- --flag` example in this repo depends on that `--`
 * being silently ignored here rather than becoming a stray flag key. One consequence: no
 * script here can take a positional argument whose value is literally the string `--` — true
 * of everything currently passed through this function, and worth knowing before it isn't.
 */
export function parseArgs(argv) {
  const positionals = [];
  const flags = {};

  for (const arg of argv) {
    if (arg === '--') continue;

    if (!arg.startsWith('--')) {
      positionals.push(arg);
      continue;
    }

    const [key, value] = arg.slice(2).split(/=(.*)/s);
    flags[key] = value ?? true;
  }

  return { flags, positionals };
}
