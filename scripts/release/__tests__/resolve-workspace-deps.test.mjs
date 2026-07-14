import { describe, expect, it, vi } from 'vitest';

import { resolveWorkspaceDependencies } from '../resolve-workspace-deps.mjs';

function fakeFindProject(versions) {
  return vi.fn((name) => {
    if (!versions[name]) throw new Error(`Unknown package: ${name}`);
    return { folder: `packages/${name.split('/')[1]}`, version: versions[name] };
  });
}

describe('resolveWorkspaceDependencies()', () => {
  it('resolves workspace:* to the dependency exact current version', () => {
    const findProject = fakeFindProject({ '@vielzeug/ripple': '1.2.1' });
    const pkg = { dependencies: { '@vielzeug/ripple': 'workspace:*' } };

    const resolved = resolveWorkspaceDependencies(pkg, { findProject });

    expect(resolved.dependencies).toEqual({ '@vielzeug/ripple': '1.2.1' });
  });

  it('resolves workspace:^ and workspace:~ by prepending the symbol to the exact version', () => {
    const findProject = fakeFindProject({ '@vielzeug/arsenal': '2.0.0', '@vielzeug/ripple': '1.2.1' });
    const pkg = {
      dependencies: {
        '@vielzeug/arsenal': 'workspace:~',
        '@vielzeug/ripple': 'workspace:^',
      },
    };

    const resolved = resolveWorkspaceDependencies(pkg, { findProject });

    expect(resolved.dependencies).toEqual({
      '@vielzeug/arsenal': '~2.0.0',
      '@vielzeug/ripple': '^1.2.1',
    });
  });

  it('strips the workspace: prefix from an explicit range, leaving it otherwise untouched', () => {
    const findProject = fakeFindProject({});
    const pkg = { dependencies: { '@vielzeug/ripple': 'workspace:^1.2.0' } };

    const resolved = resolveWorkspaceDependencies(pkg, { findProject });

    expect(resolved.dependencies).toEqual({ '@vielzeug/ripple': '^1.2.0' });
    expect(findProject).not.toHaveBeenCalled();
  });

  it('leaves non-workspace specifiers (e.g. a real semver range or an external package) untouched', () => {
    const findProject = fakeFindProject({});
    const pkg = { dependencies: { lucide: '^1.23.0' } };

    const resolved = resolveWorkspaceDependencies(pkg, { findProject });

    expect(resolved.dependencies).toEqual({ lucide: '^1.23.0' });
  });

  it('rewrites dependencies, devDependencies, peerDependencies, and optionalDependencies independently', () => {
    const findProject = fakeFindProject({ '@vielzeug/arsenal': '3.0.0', '@vielzeug/ripple': '1.2.1' });
    const pkg = {
      dependencies: { '@vielzeug/ripple': 'workspace:*' },
      devDependencies: { '@vielzeug/arsenal': 'workspace:*' },
      optionalDependencies: { '@vielzeug/arsenal': 'workspace:*' },
      peerDependencies: { '@vielzeug/ripple': 'workspace:*' },
    };

    const resolved = resolveWorkspaceDependencies(pkg, { findProject });

    expect(resolved.dependencies).toEqual({ '@vielzeug/ripple': '1.2.1' });
    expect(resolved.devDependencies).toEqual({ '@vielzeug/arsenal': '3.0.0' });
    expect(resolved.optionalDependencies).toEqual({ '@vielzeug/arsenal': '3.0.0' });
    expect(resolved.peerDependencies).toEqual({ '@vielzeug/ripple': '1.2.1' });
  });

  it('returns a package with no workspace: specifiers unchanged', () => {
    const findProject = fakeFindProject({});
    const pkg = { dependencies: { lucide: '^1.23.0' }, name: '@vielzeug/refine', version: '1.4.0' };

    const resolved = resolveWorkspaceDependencies(pkg, { findProject });

    expect(resolved).toEqual(pkg);
    expect(findProject).not.toHaveBeenCalled();
  });

  it('never mutates the input package.json object', () => {
    const findProject = fakeFindProject({ '@vielzeug/ripple': '1.2.1' });
    const pkg = { dependencies: { '@vielzeug/ripple': 'workspace:*' } };

    resolveWorkspaceDependencies(pkg, { findProject });

    expect(pkg.dependencies['@vielzeug/ripple']).toBe('workspace:*');
  });

  it('is a no-op for a package with no dependency fields at all', () => {
    const findProject = fakeFindProject({});
    const pkg = { name: '@vielzeug/ripple', version: '1.2.1' };

    expect(resolveWorkspaceDependencies(pkg, { findProject })).toEqual(pkg);
  });
});
