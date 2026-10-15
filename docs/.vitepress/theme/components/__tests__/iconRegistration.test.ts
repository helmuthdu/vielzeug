// @vitest-environment node
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { expect, it } from 'vitest';

const iconEntry = fileURLToPath(new URL('../../../../../packages/refine/src/icons/lucide/all.ts', import.meta.url));
const componentEntry = fileURLToPath(
  new URL('../../../../../packages/refine/src/content/icon/icon.ts', import.meta.url),
);

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
        load: (id) => (id === '\0icon-consumer' ? "import '@vielzeug/refine/icons/lucide/all';" : null),
        name: 'icon-registration-fixture',
        resolveId: (id) => (id === 'icon-consumer' ? '\0icon-consumer' : null),
      },
    ],
    resolve: {
      alias: { '@vielzeug/refine/icons/lucide/all': iconEntry },
    },
  });
  const outputs = (Array.isArray(result) ? result : [result]).flatMap((bundle) => bundle.output);
  const code = outputs
    .filter((output) => output.type === 'chunk')
    .map((output) => output.code)
    .join('\n');

  expect(code).toContain('registerIcons(');
  expect(code).toContain('lucideIcons(icons)');
});

it('retains internal defaults without importing Lucide in source-aliased production components', async () => {
  const result = await build({
    build: {
      minify: false,
      rollupOptions: {
        external: (id) => id === 'lucide' || (id.startsWith('@vielzeug/') && id !== '@vielzeug/refine/icon'),
        input: 'icon-component-consumer',
      },
      write: false,
    },
    configFile: false,
    logLevel: 'silent',
    plugins: [
      {
        load: (id) => (id === '\0icon-component-consumer' ? "import '@vielzeug/refine/icon';" : null),
        name: 'internal-icon-registration-fixture',
        resolveId: (id) => (id === 'icon-component-consumer' ? '\0icon-component-consumer' : null),
      },
    ],
    resolve: { alias: { '@vielzeug/refine/icon': componentEntry } },
  });
  const code = (Array.isArray(result) ? result : [result])
    .flatMap((bundle) => bundle.output)
    .filter((output) => output.type === 'chunk')
    .map((output) => output.code)
    .join('\n');
  expect(code).toContain('registerDefaultIcons(');
  expect(code).toContain('ChevronDown');
  expect(code).not.toMatch(/from ["']lucide["']/);
});
