import type * as Monaco from 'monaco-editor';

import type { ReplExecution } from './useReplExecution';

import { type SandboxLibrary } from './buildSandboxDocument';
import { formatCaughtError } from './formatCaughtError';
import { type GlobalNameResolver, rewriteVielzeugImports } from './rewriteImports';
import { transpileTypeScript } from './useMonaco';

export interface ExecuteReplCodeParams {
  execution: Pick<ReplExecution, 'clear' | 'reportError' | 'run'>;
  libraries: SandboxLibrary[];
  monaco: typeof Monaco;
  model: Monaco.editor.ITextModel | null;
  rawCode: string;
  resolveGlobalName: GlobalNameResolver;
}

/**
 * The REPL's "Run" pipeline — transpile, rewrite `@vielzeug/*` imports, execute — pulled out
 * of REPLEditor.vue so it's unit-testable without mounting Monaco or Vue.
 *
 * Every step's failure (empty input, a broken TS worker, a transpile that produces no output,
 * a rejected sandbox render) is routed through `execution.reportError()` — i.e. into the
 * REPL's own output panel — rather than only `console.error`. A "Run" that silently does
 * nothing on failure is worse than one that shows a stack trace.
 *
 * `execution.clear()` runs unconditionally before anything else, not just inside
 * `execution.run()` — otherwise a failure that happens *before* `run()` (e.g. a transpile
 * error) would leave whatever the previous run printed on screen, with the new error just
 * appended underneath it. "Run" should always mean "start fresh," regardless of which step
 * fails.
 */
export async function executeReplCode(params: ExecuteReplCodeParams): Promise<void> {
  const { execution, libraries, model, monaco, rawCode, resolveGlobalName } = params;

  execution.clear();

  if (!rawCode.trim()) {
    execution.reportError('No code to execute.');

    return;
  }

  try {
    const jsCode = model ? await transpileTypeScript(monaco, model) : rawCode;
    const runnableCode = rewriteVielzeugImports(jsCode, resolveGlobalName);

    await execution.run(runnableCode, libraries);
  } catch (err) {
    execution.reportError(formatCaughtError(err));
  }
}
