import { afterEach, describe, expect, it, vi } from 'vitest';
import { getBundleConfig, getConfig } from '../../vite.config.ts';

afterEach(() => vi.unstubAllEnvs());

describe('library build diagnostics', () => {
  it.each(['CI', 'RUSHSTACK_FILE_ERROR_BASE_FOLDER'])('omits profiling warnings under %s without suppressing other checks', (name) => {
    vi.stubEnv(name, name === 'CI' ? 'true' : '/workspace');
    expect(getConfig('/workspace').build.rolldownOptions.checks).toEqual({ pluginTimings: false });
    expect(getBundleConfig('/workspace', { fileName: 'example', name: 'Example' }).build.rolldownOptions.checks).toEqual({ pluginTimings: false });
  });

  it('retains profiling hints during standalone local builds', () => {
    vi.stubEnv('CI', undefined);
    vi.stubEnv('RUSHSTACK_FILE_ERROR_BASE_FOLDER', undefined);
    expect(getConfig('/workspace').build.rolldownOptions.checks.pluginTimings).toBe(true);
    expect(getBundleConfig('/workspace', { fileName: 'example', name: 'Example' }).build.rolldownOptions.checks.pluginTimings).toBe(true);
  });
});
