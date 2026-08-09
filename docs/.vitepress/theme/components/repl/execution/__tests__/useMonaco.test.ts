import { describe, expect, it, vi } from 'vitest';

import { configureTypeScript } from '../useMonaco';

describe('configureTypeScript', () => {
  it('uses the Monaco 0.56 TypeScript API namespace', () => {
    const setCompilerOptions = vi.fn();
    const monaco = {
      typescript: {
        ModuleKind: { ESNext: 99 },
        ModuleResolutionKind: { NodeJs: 2 },
        ScriptTarget: { ESNext: 99 },
        typescriptDefaults: { setCompilerOptions },
      },
    };

    configureTypeScript(monaco);

    expect(setCompilerOptions).toHaveBeenCalledWith({
      allowNonTsExtensions: true,
      esModuleInterop: true,
      module: 99,
      moduleResolution: 2,
      target: 99,
    });
  });
});
