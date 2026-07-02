import { createSandboxTestHelpers } from '@vielzeug/sandbox/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ref } from 'vue';

import { useReplExecution } from '../useReplExecution';

function makeContainer(): HTMLElement {
  const container = document.createElement('div');

  document.body.appendChild(container);

  return container;
}

describe('useReplExecution', () => {
  let container: HTMLElement;
  let execution: ReturnType<typeof useReplExecution>;

  beforeEach(() => {
    container = makeContainer();
    execution = useReplExecution(ref(container));
  });

  afterEach(() => {
    execution.dispose();
    container.remove();
  });

  it('starts with no output and isExecuting false', () => {
    expect(execution.output.value).toEqual([]);
    expect(execution.isExecuting.value).toBe(false);
  });

  it('sets isExecuting while a run is in flight, and mounts a sandbox iframe', async () => {
    const runPromise = execution.run('console.log(1)', []);

    expect(execution.isExecuting.value).toBe(true);
    expect(container.querySelector('iframe')).not.toBeNull();

    createSandboxTestHelpers(container).fireReady();
    await runPromise;
  });

  it('turns a repl:console custom message into an output line', async () => {
    const runPromise = execution.run('', []);
    const helpers = createSandboxTestHelpers(container);

    helpers.fireReady();
    await runPromise;

    helpers.fireCustom('repl:console', { level: 'log', parts: ['hello', 42] });

    expect(execution.output.value).toEqual([expect.objectContaining({ text: "'hello' 42", type: 'log' })]);
  });

  it('turns a repl:result custom message into a result output line', async () => {
    const runPromise = execution.run('', []);
    const helpers = createSandboxTestHelpers(container);

    helpers.fireReady();
    await runPromise;

    helpers.fireCustom('repl:result', 42);

    expect(execution.output.value).toEqual([expect.objectContaining({ text: '42', type: 'result' })]);
  });

  it('flips isExecuting back to false on repl:done', async () => {
    const runPromise = execution.run('', []);
    const helpers = createSandboxTestHelpers(container);

    helpers.fireReady();
    await runPromise;

    expect(execution.isExecuting.value).toBe(true);
    helpers.fireCustom('repl:done');
    expect(execution.isExecuting.value).toBe(false);
  });

  it('reports a bridge-level error message as an error output line', async () => {
    const runPromise = execution.run('', []);
    const helpers = createSandboxTestHelpers(container);

    helpers.fireReady();
    await runPromise;

    helpers.fireError('boom', 'Error: boom\n  at x.js:1:1');

    expect(execution.output.value).toEqual([
      expect.objectContaining({ text: 'Error: boom\n  at x.js:1:1', type: 'error' }),
    ]);
  });

  it('clear() empties the output log', async () => {
    const runPromise = execution.run('', []);
    const helpers = createSandboxTestHelpers(container);

    helpers.fireReady();
    await runPromise;
    helpers.fireCustom('repl:console', { level: 'log', parts: ['x'] });

    expect(execution.output.value).toHaveLength(1);
    execution.clear();
    expect(execution.output.value).toHaveLength(0);
  });

  it('run() clears previous output before starting a new run', async () => {
    const helpers = createSandboxTestHelpers(container);

    const first = execution.run('', []);

    helpers.fireReady();
    await first;
    helpers.fireCustom('repl:console', { level: 'log', parts: ['first run'] });
    expect(execution.output.value).toHaveLength(1);

    const second = execution.run('', []);

    expect(execution.output.value).toHaveLength(0);
    helpers.fireReady();
    await second;
  });

  describe('reportError', () => {
    it('pushes an error output line and resets isExecuting', () => {
      execution.isExecuting.value = true;

      execution.reportError('boom');

      expect(execution.isExecuting.value).toBe(false);
      expect(execution.output.value).toEqual([expect.objectContaining({ text: 'boom', type: 'error' })]);
    });
  });

  describe('run() failure path', () => {
    it('reports an error and resets isExecuting when the sandbox cannot be created', async () => {
      const detached = useReplExecution(ref(null));

      await detached.run('console.log(1)', []);

      expect(detached.isExecuting.value).toBe(false);
      expect(detached.output.value).toEqual([
        expect.objectContaining({ text: expect.stringContaining('sandbox container is not mounted'), type: 'error' }),
      ]);
      detached.dispose();
    });
  });

  describe('cancel', () => {
    it('resets isExecuting and clears output without disposing the sandbox', async () => {
      const runPromise = execution.run('', []);
      const helpers = createSandboxTestHelpers(container);

      helpers.fireReady();
      await runPromise;
      helpers.fireCustom('repl:console', { level: 'log', parts: ['x'] });
      expect(execution.isExecuting.value).toBe(true);
      expect(execution.output.value).toHaveLength(1);

      execution.cancel();

      expect(execution.isExecuting.value).toBe(false);
      expect(execution.output.value).toEqual([]);
      expect(execution.disposed.value).toBe(false);
    });

    it('is a no-op (beyond clearing state) when no run has ever started', () => {
      expect(() => execution.cancel()).not.toThrow();
      expect(container.querySelector('iframe')).toBeNull();
    });

    it("drops a message tagged with the abandoned run's generation, but not a fresh one", async () => {
      const helpers = createSandboxTestHelpers(container);
      const runPromise = execution.run('', []);

      helpers.fireReady();
      await runPromise;

      execution.cancel();
      helpers.fireReady(); // the reset render becoming ready — bumps to a new generation

      // Tagged with the superseded (first) render's generation — @vielzeug/sandbox itself
      // drops this before it reaches handleMessage().
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { detail: { level: 'log', parts: ['stale'] }, event: 'repl:console', generation: 0, type: 'custom' },
          source: container.querySelector('iframe')?.contentWindow,
        }),
      );
      expect(execution.output.value).toEqual([]);

      // A message with no generation tag (as the test helper sends) is always trusted —
      // proves the pipeline still works normally after a cancel(), not just that it drops
      // stale messages.
      helpers.fireCustom('repl:console', { level: 'log', parts: ['fresh'] });
      expect(execution.output.value).toEqual([expect.objectContaining({ text: "'fresh'" })]);
    });
  });

  describe('untrusted message handling', () => {
    it('ignores a repl:console message whose detail is not a { parts: [] } shape', async () => {
      const runPromise = execution.run('', []);
      const helpers = createSandboxTestHelpers(container);

      helpers.fireReady();
      await runPromise;

      helpers.fireCustom('repl:console', { level: 'log', parts: null });
      helpers.fireCustom('repl:console', 'not an object');

      expect(execution.output.value).toEqual([]);
    });

    it('falls back to "log" for an unrecognized level instead of trusting it verbatim', async () => {
      const runPromise = execution.run('', []);
      const helpers = createSandboxTestHelpers(container);

      helpers.fireReady();
      await runPromise;

      helpers.fireCustom('repl:console', { level: 'haxx', parts: ['x'] });

      expect(execution.output.value).toEqual([expect.objectContaining({ type: 'log' })]);
    });
  });

  describe('disposal', () => {
    it('is idempotent and flips disposed to true', () => {
      expect(execution.disposed.value).toBe(false);

      execution.dispose();
      expect(execution.disposed.value).toBe(true);

      expect(() => execution.dispose()).not.toThrow();
    });

    it('[Symbol.dispose] tears the sandbox down the same as dispose()', () => {
      execution[Symbol.dispose]();

      expect(execution.disposed.value).toBe(true);
    });
  });
});
