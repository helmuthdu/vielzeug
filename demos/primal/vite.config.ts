import { fileURLToPath } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';
import { collectLocalPackageMap } from './scripts/local-packages.ts';

const demoRoot = fileURLToPath(new URL('.', import.meta.url));
// VIELZEUG_LOCAL_DEV=1 resolves every `@vielzeug/*` import to the sibling package source so
// edits to a package show up in the demo without a build/reinstall cycle. Outside a monorepo
// checkout the map is empty and the published dependencies are used instead.
const localPackageMap = process.env.VIELZEUG_LOCAL_DEV === '1' ? collectLocalPackageMap(demoRoot) : {};
const alias = Object.entries(localPackageMap).map(([specifier, replacement]) => ({
  find: new RegExp(`^${specifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`),
  replacement,
}));

export default defineConfig({
  base: process.env.DEMO_BASE ?? '/',
  build: { emptyOutDir: true, outDir: process.env.DEMO_OUT_DIR ?? 'dist' },
  plugins: [
    vue({
      template: {
        compilerOptions: {
          // Refine ships as `ore-*` custom elements; Vue must not try to resolve them as components.
          isCustomElement: (tag) => tag.startsWith('ore-'),
        },
      },
    }),
  ],
  resolve: { alias },
  server: {
    // Cloudflare quick tunnels hand out a random *.trycloudflare.com hostname per run.
    allowedHosts: ['.trycloudflare.com'],
  },
});
