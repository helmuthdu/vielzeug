import { createSandbox, type SandboxHandle, type SandboxMessage } from '@vielzeug/sandbox';
import { type Ref, ref } from 'vue';

import { buildSandboxRunHtml, type SandboxLibrary } from './buildSandboxDocument';
import { formatCaughtError } from './formatCaughtError';
import { stringify } from './stringify';

export interface OutputLine {
  id: number;
  text: string;
  time: string;
  type: 'error' | 'log' | 'result' | 'warn';
}

export interface ReplExecution {
  readonly disposed: Ref<boolean>;
  isExecuting: Ref<boolean>;
  output: Ref<OutputLine[]>;
  [Symbol.dispose](): void;
  cancel(): void;
  clear(): void;
  dispose(): void;
  reportError(message: string): void;
  run(code: string, libraries: SandboxLibrary[]): Promise<void>;
}

// Everything posted from inside the sandbox is untrusted input (see @vielzeug/sandbox's own
// "SandboxMessage data is untrusted" warning) — the iframe only ever runs code this REPL put
// there itself, but nothing stops that code from calling `parent.postMessage` directly and
// forging a payload that doesn't match what buildSandboxDocument.ts actually sends. Narrowing
// here means a malformed/hostile message degrades to "ignored" instead of throwing inside the
// host's message listener.
function isReplConsoleDetail(value: unknown): value is { level: unknown; parts: unknown[] } {
  return typeof value === 'object' && value !== null && Array.isArray((value as { parts?: unknown }).parts);
}

function toOutputLevel(level: unknown): 'error' | 'log' | 'warn' {
  return level === 'warn' || level === 'error' ? level : 'log';
}

/**
 * Owns the single @vielzeug/sandbox instance a REPL editor executes code in, and turns its
 * postMessage protocol into a reactive `output` log.
 *
 * One sandbox is created lazily on the first run and reused for every subsequent run —
 * `sandbox.render()` already replaces the whole iframe document (and therefore its `window`)
 * each time, so there's no cross-run state to worry about; recreating the sandbox itself
 * would only add churn.
 *
 * Note on hung code: if user code never settles (e.g. an infinite loop), the 'repl:done'
 * message this composable waits for never arrives and `isExecuting` stays true until the
 * next run. There's no way to forcibly interrupt synchronous JS running inside the iframe
 * without a Worker (which can be `terminate()`d) — out of scope here, same limitation as
 * most browser-based code playgrounds.
 */
export function useReplExecution(container: Ref<HTMLElement | null>): ReplExecution {
  const output = ref<OutputLine[]>([]);
  const isExecuting = ref(false);
  const disposed = ref(false);

  let sandbox: SandboxHandle | null = null;
  let unsubscribe: (() => void) | null = null;
  let nextLineId = 0;

  function pushLine(type: OutputLine['type'], text: string): void {
    output.value.push({
      id: nextLineId++,
      text,
      time: new Date().toLocaleTimeString('en-US', { hour12: false }),
      type,
    });
  }

  function handleMessage(msg: SandboxMessage): void {
    if (msg.type === 'error') {
      pushLine('error', msg.stack ?? msg.message);

      return;
    }

    if (msg.type !== 'custom') return;

    switch (msg.event) {
      case 'repl:console': {
        if (!isReplConsoleDetail(msg.detail)) break;

        pushLine(toOutputLevel(msg.detail.level), msg.detail.parts.map(stringify).join(' '));
        break;
      }
      case 'repl:done':
        isExecuting.value = false;
        break;
      case 'repl:result':
        pushLine('result', stringify(msg.detail));
        break;
    }
  }

  function ensureSandbox(): SandboxHandle {
    if (sandbox) return sandbox;

    if (!container.value) throw new Error('useReplExecution: sandbox container is not mounted yet.');

    sandbox = createSandbox(container.value);
    unsubscribe = sandbox.onMessage(handleMessage);

    return sandbox;
  }

  function clear(): void {
    output.value = [];
  }

  function reportError(message: string): void {
    isExecuting.value = false;
    pushLine('error', message);
  }

  async function run(code: string, libraries: SandboxLibrary[]): Promise<void> {
    clear();
    isExecuting.value = true;

    try {
      await ensureSandbox().render(buildSandboxRunHtml({ code, libraries }));
    } catch (err) {
      reportError(formatCaughtError(err));
    }
  }

  // Abandons whatever the sandbox is currently running (e.g. the user switched libraries
  // mid-run) without tearing the sandbox down. render() replacing the document bumps
  // @vielzeug/sandbox's internal generation counter, and every message the abandoned run's
  // code posts afterward carries the old generation — the sandbox package itself drops those
  // before they ever reach handleMessage(). That's simpler and more robust than this
  // composable tracking its own "is this message still relevant" state.
  //
  // Always clears output too — a "cancel" that leaves the abandoned run's (now-meaningless)
  // output on screen isn't really a cancel from the user's point of view, so there's no
  // separate "cancel but don't clear" mode to reason about.
  function cancel(): void {
    isExecuting.value = false;
    clear();

    if (!sandbox) return;

    // A non-empty placeholder avoids @vielzeug/sandbox's dev-only "render() called with empty
    // HTML" warning — this is an intentional reset, not a mistake. Errors are swallowed
    // (not reported — the user didn't ask to run anything) rather than left as an unhandled
    // rejection.
    sandbox.render('<!-- repl reset -->').catch(() => {});
  }

  function dispose(): void {
    if (disposed.value) return;

    disposed.value = true;
    unsubscribe?.();
    sandbox?.dispose();
  }

  return {
    cancel,
    clear,
    dispose,
    disposed,
    isExecuting,
    output,
    reportError,
    run,
    [Symbol.dispose]: dispose,
  };
}
