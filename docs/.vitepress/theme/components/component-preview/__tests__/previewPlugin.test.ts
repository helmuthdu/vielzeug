import { resolve } from 'node:path';
import { createServer } from 'vite';
import { describe, expect, it, vi } from 'vitest';

import { componentPreviewPlugin } from '../../../../plugins/component-preview/plugin';

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
