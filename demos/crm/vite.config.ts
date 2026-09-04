import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { collectLocalPackageMap } from './scripts/local-packages.ts';

const demoRoot = fileURLToPath(new URL('.', import.meta.url));
const localPackageMap = process.env.VIELZEUG_LOCAL_DEV === '1' ? collectLocalPackageMap(demoRoot) : {};
const alias = Object.entries(localPackageMap).map(([specifier, replacement]) => ({
  find: new RegExp(`^${specifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`),
  replacement,
}));

export default defineConfig({ resolve: { alias } });
