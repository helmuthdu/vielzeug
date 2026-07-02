import { describe, expect, it, vi } from 'vitest';

import { executeReplCode } from '../executeReplCode';

vi.mock('../useMonaco', () => ({
  transpileTypeScript: vi.fn(),
}));

const { transpileTypeScript } = await import('../useMonaco');

function makeExecutionStub() {
  return {
    clear: vi.fn(),
    reportError: vi.fn(),
    run: vi.fn().mockResolvedValue(undefined),
  };
}

describe('executeReplCode', () => {
  it('reports "No code to execute" for blank code — no transpile, no run', async () => {
    const execution = makeExecutionStub();

    await executeReplCode({
      execution,
      libraries: [],
      model: null,
      // @ts-expect-error -- monaco isn't touched on the blank-code path
      monaco: undefined,
      rawCode: '   \n  ',
      resolveGlobalName: (lib) => lib,
    });

    expect(transpileTypeScript).not.toHaveBeenCalled();
    expect(execution.run).not.toHaveBeenCalled();
    expect(execution.reportError).toHaveBeenCalledWith('No code to execute.');
  });

  it('clears previous output before doing anything else, even on the blank-code path', async () => {
    const execution = makeExecutionStub();

    await executeReplCode({
      execution,
      libraries: [],
      model: null,
      // @ts-expect-error -- monaco isn't touched on the blank-code path
      monaco: undefined,
      rawCode: '',
      resolveGlobalName: (lib) => lib,
    });

    expect(execution.clear).toHaveBeenCalledOnce();
  });

  it('runs the raw code directly when there is no Monaco model', async () => {
    const execution = makeExecutionStub();
    const libraries = [{ globalName: 'Arsenal', iifeSource: 'var Arsenal = {};' }];

    await executeReplCode({
      execution,
      libraries,
      model: null,
      // @ts-expect-error -- monaco isn't touched when model is null
      monaco: undefined,
      rawCode: "console.log('hi')",
      resolveGlobalName: (lib) => lib,
    });

    expect(transpileTypeScript).not.toHaveBeenCalled();
    expect(execution.run).toHaveBeenCalledWith("console.log('hi')", libraries);
  });

  it('transpiles via Monaco and rewrites @vielzeug imports before running', async () => {
    const execution = makeExecutionStub();

    vi.mocked(transpileTypeScript).mockResolvedValue("import { chunk } from '@vielzeug/arsenal';\nchunk([1], 1);");

    await executeReplCode({
      execution,
      libraries: [],
      // @ts-expect-error -- a stub model is enough; transpileTypeScript is mocked
      model: {},
      // @ts-expect-error -- a stub is enough; transpileTypeScript is mocked
      monaco: {},
      rawCode: "import { chunk } from '@vielzeug/arsenal';\nchunk([1], 1);",
      resolveGlobalName: () => 'Arsenal',
    });

    expect(execution.run).toHaveBeenCalledWith('const { chunk } = window.Arsenal;\nchunk([1], 1);', []);
  });

  it('reports a transpile failure as an execution error instead of throwing', async () => {
    const execution = makeExecutionStub();

    vi.mocked(transpileTypeScript).mockRejectedValue(new Error('TypeScript transpile produced no JavaScript output.'));

    await executeReplCode({
      execution,
      libraries: [],
      // @ts-expect-error -- a stub model is enough; transpileTypeScript is mocked
      model: {},
      // @ts-expect-error -- a stub is enough; transpileTypeScript is mocked
      monaco: {},
      rawCode: 'const x: = ;',
      resolveGlobalName: (lib) => lib,
    });

    expect(execution.run).not.toHaveBeenCalled();
    expect(execution.reportError).toHaveBeenCalledWith(expect.stringContaining('produced no JavaScript output'));
    // Regression check: a failure before execution.run() is ever reached must not leave a
    // previous run's output on screen with the new error just appended underneath it.
    expect(execution.clear).toHaveBeenCalledOnce();
  });

  it('reports a run() rejection as an execution error', async () => {
    const execution = makeExecutionStub();

    execution.run.mockRejectedValue(new Error('sandbox exploded'));

    await executeReplCode({
      execution,
      libraries: [],
      model: null,
      // @ts-expect-error -- monaco isn't touched when model is null
      monaco: undefined,
      rawCode: "console.log('hi')",
      resolveGlobalName: (lib) => lib,
    });

    expect(execution.reportError).toHaveBeenCalledWith(expect.stringContaining('sandbox exploded'));
  });
});
