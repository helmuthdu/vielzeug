import { type Binding, type HtmlBinding, type HTMLResult } from './internal';
import { effect } from './runtime-lifecycle';
import { applyBindingsWithTargets } from './template-bindings';
import { type RegisterCleanup } from './template-bindings';
import { compileTemplate, resetTemplateCompilerState } from './template-compiler';
import { indexBindings } from './template-dom';
import { applyHtmlBinding as applyHtmlBindingImpl, type KeyedNode } from './template-html';

// ─── Re-exports for consumers ─────────────────────────────────────────────────
export type { KeyedNode };

// ─── Binding application orchestration ────────────────────────────────────────

export const applyBindingsInContainer = (
  container: ParentNode,
  bindings: Binding[],
  registerCleanup: RegisterCleanup,
  opts?: { onHtml?: (b: HtmlBinding) => void },
) => {
  applyBindingsWithTargets(bindings, registerCleanup, indexBindings(container), opts);
};

// ─── Reset and compilation ────────────────────────────────────────────────────

export const _resetMarkerIndex = (): void => {
  resetTemplateCompilerState();
};

export const html = (strings: TemplateStringsArray, ...values: unknown[]): HTMLResult =>
  compileTemplate(strings, values, effect);

// ─── HTML binding with keyed reconciliation ────────────────────────────────────

export const applyHtmlBinding = (
  root: Node,
  b: HtmlBinding,
  registerCleanup: RegisterCleanup,
  keyedStates: Map<string, Map<string | number, KeyedNode>>,
): void => {
  applyHtmlBindingImpl(root, b, registerCleanup, keyedStates, applyBindingsInContainer);
};
