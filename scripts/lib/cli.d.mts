// Type declarations for cli.mjs, consumed by the .ts scripts (generate-repl-registry.ts,
// validate-repl.ts) that import this plain-JS module for tsc/eslint's benefit — the runtime
// itself needs zero build step, which is why this stays .mjs, not .ts.

export function isMain(moduleUrl: string): boolean;

export interface RunOptions {
  cwd?: string;
  inherit?: boolean;
  quiet?: boolean;
}

export function run(cmd: string, args: readonly string[], options?: RunOptions): string | null;

export interface ParsedArgs {
  flags: Record<string, string | boolean>;
  positionals: string[];
}

export function parseArgs(argv: readonly string[]): ParsedArgs;
