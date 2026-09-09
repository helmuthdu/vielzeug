#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const elementMapPath = resolve(packageRoot, 'src/types/elements.d.ts');
const outputDir = resolve(packageRoot, 'dist/frameworks');
const typeOutputDir = resolve(packageRoot, 'dist/types');
const elementMap = readFileSync(elementMapPath, 'utf8');
const publishedElementMap = elementMap.replace(/(from\s+['"])(\.\.[^'"]+)(['"])/g, '$1$2.js$3');

const tags = [...elementMap.matchAll(/^\s*'(ore-[^']+)':/gm)]
  .map((match) => match[1])
  .sort();

const tagUnion = tags.map((tag) => `'${tag}'`).join(' | ');
const elements = `// Generated from src/types/elements.d.ts. Do not edit directly.
import type {} from '../types/elements.js';

export type RefineElementTag = ${tagUnion};
export type RefineElementMap = Pick<HTMLElementTagNameMap, RefineElementTag>;
`;

const react = `// Generated from src/types/elements.d.ts. Do not edit directly.
import type { HTMLAttributes } from 'react';

import type { RefineElementMap } from './elements.js';

export type RefineReactElementProps<Element extends HTMLElement> = HTMLAttributes<Element> &
  Partial<Omit<Element, keyof HTMLElement>>;

export type RefineReactIntrinsicElements = {
  [Tag in keyof RefineElementMap]: RefineReactElementProps<RefineElementMap[Tag]>;
};

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements extends RefineReactIntrinsicElements {}
  }
}

export {};
`;

const vue = `// Generated from src/types/elements.d.ts. Do not edit directly.
import type { DefineComponent } from 'vue';

import type { RefineElementMap } from './elements.js';

export type RefineVueElementProps<Element extends HTMLElement> = Partial<Omit<Element, keyof HTMLElement>>;

export type RefineVueGlobalComponents = {
  [Tag in keyof RefineElementMap]: DefineComponent<RefineVueElementProps<RefineElementMap[Tag]>>;
};

declare module 'vue' {
  export interface GlobalComponents extends RefineVueGlobalComponents {}
}

export {};
`;

mkdirSync(outputDir, { recursive: true });
mkdirSync(typeOutputDir, { recursive: true });
writeFileSync(resolve(typeOutputDir, 'elements.d.ts'), publishedElementMap);
writeFileSync(resolve(outputDir, 'elements.d.ts'), elements);
writeFileSync(resolve(outputDir, 'react.d.ts'), react);
writeFileSync(resolve(outputDir, 'vue.d.ts'), vue);

console.log(`Generated framework element types for ${tags.length} custom elements.`);
