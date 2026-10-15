// @vitest-environment node
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { expect, it } from 'vitest';

const iconEntry = fileURLToPath(new URL('../../../../../packages/refine/src/icon-lucide.ts', import.meta.url));

it('retains Lucide registration in production builds using source aliases', async () => {
  const result = await build({
    build: {
      minify: false,
      rollupOptions: {
        external: ['lucide'],
        input: 'icon-consumer',
      },
      write: false,
    },
    configFile: false,
    logLevel: 'silent',
    plugins: [
      {
        load: (id) => (id === '\0icon-consumer' ? "import '@vielzeug/refine/icon-lucide';" : null),
        name: 'icon-registration-fixture',
        resolveId: (id) => (id === 'icon-consumer' ? '\0icon-consumer' : null),
      },
    ],
    resolve: {
      alias: { '@vielzeug/refine/icon-lucide': iconEntry },
    },
  });
  const outputs = (Array.isArray(result) ? result : [result]).flatMap((bundle) => bundle.output);
  const code = outputs
    .filter((output) => output.type === 'chunk')
    .map((output) => output.code)
    .join('\n');

  expect(code).toContain('registerIcons(');
  expect(code).toContain('.icons');
});
