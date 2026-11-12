import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createServer } from 'vite';
import { describe, expect, it, vi } from 'vitest';

import { componentPreviewPlugin, depPaths } from '../../../../plugins/component-preview/plugin';

describe('preview dependency refresh', () => {
  it.each(['add', 'change', 'unlink'])('reloads previews when the Prism bundle emits %s', async (event) => {
    const server = await createServer({
      configFile: false,
      plugins: [componentPreviewPlugin()],
      server: { middlewareMode: true },
    });

    try {
      const send = vi.spyOn(server.ws, 'send');
      const file = resolve(import.meta.dirname, '../../../../../../packages/prism/dist/prism.iife.js');

      server.watcher.emit(event, file);
      expect(send).toHaveBeenCalledWith({ type: 'full-reload' });
    } finally {
      await server.close();
    }
  });
});

describe('preview dependency derivation', () => {
  const pkgDir = resolve(import.meta.dirname, '../../../../../../packages');

  const depsOf = (pkg: string): string[] => {
    const manifest = JSON.parse(readFileSync(resolve(pkgDir, pkg, 'package.json'), 'utf-8')) as {
      dependencies?: Record<string, string>;
    };

    return Object.keys(manifest.dependencies ?? {})
      .filter((dep) => dep.startsWith('@vielzeug/'))
      .map((dep) => dep.slice('@vielzeug/'.length));
  };

  it('loads an IIFE for every workspace dependency of refine', () => {
    const loaded = new Set(
      depPaths.map((p) => p.match(/packages\/([^/]+)\/dist\/[^/]+\.iife\.js$/)?.[1]).filter(Boolean),
    );

    for (const dep of depsOf('refine')) {
      expect(loaded, `refine depends on @vielzeug/${dep}, but the preview runtime never loads it`).toContain(dep);
    }
  });

  it('loads every IIFE after the IIFEs it depends on', () => {
    const order = depPaths
      .map((p) => p.match(/packages\/([^/]+)\/dist\/[^/]+\.iife\.js$/)?.[1])
      .filter(Boolean) as string[];

    for (const [index, name] of order.entries()) {
      for (const dep of depsOf(name)) {
        const depIndex = order.indexOf(dep);

        if (depIndex !== -1) {
          expect(depIndex, `@vielzeug/${dep} must load before @vielzeug/${name}`).toBeLessThan(index);
        }
      }
    }
  });
});
