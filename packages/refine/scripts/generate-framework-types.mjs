#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = resolve(packageRoot, 'dist/custom-elements.json');
const outputDir = resolve(packageRoot, 'dist/frameworks');

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const tags = [
  ...new Set(
    manifest.modules
      .flatMap((module) => module.declarations ?? [])
      .filter((declaration) => declaration.customElement && typeof declaration.tagName === 'string')
      .map((declaration) => declaration.tagName),
  ),
].sort();

const tagUnion = tags.map((tag) => `'${tag}'`).join(' | ');
const mapEntries = tags.map((tag) => `  '${tag}': HTMLElement;`).join('\n');

const elements = `// Generated from dist/custom-elements.json. Do not edit directly.
export type RefineElementTag = ${tagUnion};

export interface RefineElementMap {
${mapEntries}
}

declare global {
  interface HTMLElementTagNameMap extends RefineElementMap {}
}

export {};
`;

const react = `// Generated from dist/custom-elements.json. Do not edit directly.
import type { HTMLAttributes } from 'react';

import type { RefineElementMap } from './elements';

export type RefineReactElementProps = HTMLAttributes<HTMLElement> & Record<string, unknown>;

export type RefineReactIntrinsicElements = {
  [Tag in keyof RefineElementMap]: RefineReactElementProps;
};

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements extends RefineReactIntrinsicElements {}
  }
}

export {};
`;

const vue = `// Generated from dist/custom-elements.json. Do not edit directly.
import type { DefineComponent } from 'vue';

import type { RefineElementMap } from './elements';

export type RefineVueElement = DefineComponent<Record<string, unknown>>;

export type RefineVueGlobalComponents = {
  [Tag in keyof RefineElementMap]: RefineVueElement;
};

declare module 'vue' {
  export interface GlobalComponents extends RefineVueGlobalComponents {}
}

export {};
`;

mkdirSync(outputDir, { recursive: true });
writeFileSync(resolve(outputDir, 'elements.d.ts'), elements);
writeFileSync(resolve(outputDir, 'react.d.ts'), react);
writeFileSync(resolve(outputDir, 'vue.d.ts'), vue);

console.log(`Generated framework element types for ${tags.length} custom elements.`);
