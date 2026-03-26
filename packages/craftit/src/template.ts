import { type HtmlBinding, type HTMLResult } from './internal';
import { applyBindingsInContainer as applyBindingsInContainerImpl, type RegisterCleanup } from './template-bindings';
import { compileTemplate } from './template-compiler';
import { applyHtmlBinding as applyHtmlBindingImpl, type KeyedNode } from './template-html';

// ─── Re-exports for consumers ─────────────────────────────────────────────────
export type { KeyedNode };
export const applyBindingsInContainer = applyBindingsInContainerImpl;

// ─── Template compilation ─────────────────────────────────────────────────────

export const html = (strings: TemplateStringsArray, ...values: unknown[]): HTMLResult =>
  compileTemplate(strings, values);

// ─── HTML binding with keyed reconciliation ────────────────────────────────────

export const applyHtmlBinding = (
  root: Node,
  b: HtmlBinding,
  registerCleanup: RegisterCleanup,
  keyedStates: Map<string, Map<string | number, KeyedNode>>,
): void => {
  applyHtmlBindingImpl(root, b, registerCleanup, keyedStates);
};
