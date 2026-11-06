/**
 * Shared harness for the repo's structural validators (validate-docs.ts, validate-readme.ts,
 * validate-sidebar.ts). Each one used to repeat the same `main()`: parse argv, apply a
 * `--package=` filter, run the rules, print `[rule] file:line: message` + hint diagnostics,
 * print a pluralized summary, set the exit code, and catch at the `isMain` boundary. Three
 * copies drifted into three different path-display styles (relative to ROOT, `package/README.md`,
 * a hand-stripped ROOT prefix) and only one of them rejected a bare `--package` flag instead of
 * silently validating every package. One harness, one output format: a validator contributes
 * only its rules and a label.
 *
 * `resolvePackageFilter()` started life in validate-repl.ts (the strict rule was its idea);
 * the harness now applies it everywhere, so it lives here. validate-repl.ts keeps its own
 * reporting (it spawns a vitest subprocess and reports example counts, not diagnostics), but
 * imports this filter.
 *
 * This is a `.ts` module on purpose: every consumer is a `.ts` script, so it needs no
 * hand-written `.d.mts` sibling (see the `.ts`/`.mjs` boundary rule in scripts/AGENTS.md).
 */

import { relative } from 'node:path';

import { parseArgs } from './cli.mjs';

/** One structural finding: which rule fired, in which file/package, with a fix hint. */
export interface Diagnostic {
  file: string;
  hint?: string;
  line?: number;
  message: string;
  package: string;
  rule: string;
}

export interface ValidationResult {
  checkedPackages: readonly string[];
  diagnostics: readonly Diagnostic[];
}

/** The `--package=<name>` filter value, or null for "validate everything". Throws (rather
 * than silently validating every package) when the flag was passed bare as `--package`. */
export function resolvePackageFilter(packageFlag: unknown): string | null {
  if (packageFlag === undefined) return null;

  if (typeof packageFlag !== 'string') throw new Error('Use --package=<name>.');

  return packageFlag;
}

export interface RunValidatorOptions {
  /** argv without the interpreter/script prefix; defaults to the real process argv. */
  argv?: readonly string[];
  /** Noun phrase naming what was validated, used in both summary lines, e.g.
   * "documentation structure" → "Validated documentation structure for N packages." and
   * "3 documentation structure failures." */
  label: string;
  /** Repo root: diagnostics print their file paths relative to it. */
  root: string;
  validate: (filterPackage: string | null) => ValidationResult | Promise<ValidationResult>;
}

/**
 * Parse `--package=`, run the validator, report, and set `process.exitCode`. Never throws:
 * a validator error (unknown `--package` name, unreadable config) prints in full, cause
 * chain included (see scripts/AGENTS.md's `isMain` catch rule), and fails the run.
 */
export async function runValidator({ argv = process.argv.slice(2), label, root, validate }: RunValidatorOptions): Promise<void> {
  try {
    const { flags } = parseArgs(argv);
    const result = await validate(resolvePackageFilter(flags.package));

    if (result.diagnostics.length === 0) {
      console.log(`Validated ${label} for ${result.checkedPackages.length} package${result.checkedPackages.length === 1 ? '' : 's'}.`);
      return;
    }

    for (const item of result.diagnostics) {
      const location = item.line ? `:${item.line}` : '';
      console.error(`[${item.rule}] ${relative(root, item.file)}${location}: ${item.message}`);
      if (item.hint) console.error(`  hint: ${item.hint}`);
    }
    console.error(`${result.diagnostics.length} ${label} failure${result.diagnostics.length === 1 ? '' : 's'}.`);
    process.exitCode = 1;
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  }
}
