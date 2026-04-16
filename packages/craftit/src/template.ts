import { type HTMLResult } from './internal';
import { compileTemplate } from './template-compiler';
import { type KeyedNode } from './template-html';

// ─── Re-exports for consumers ─────────────────────────────────────────────────
export type { KeyedNode };

// ─── Template compilation ─────────────────────────────────────────────────────

export const html = (strings: TemplateStringsArray, ...values: unknown[]): HTMLResult =>
  compileTemplate(strings, values);
