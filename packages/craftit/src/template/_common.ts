/**
 * Template Utilities
 * Shared utilities for template processing to avoid circular dependencies
 */

import type { TemplateResult } from './html';

// Lazy-loaded to avoid circular dependency
let renderTemplateRef: ((template: TemplateResult, target: Element | ShadowRoot) => void) | null = null;

/**
 * Set the renderTemplate function reference
 * Called by html.ts during module initialization
 * @internal
 */
export function setRenderTemplate(fn: (template: TemplateResult, target: Element | ShadowRoot) => void): void {
  renderTemplateRef = fn;
}

/**
 * Create DocumentFragment from template result or string
 *
 * Note: String content is treated as raw HTML (already escaped).
 * TemplateResult content goes through full processing with escaping and signal wiring.
 */
export function createFragment(content: TemplateResult | string | import('./directives').Directive): DocumentFragment {
  if (typeof content === 'string') {
    const template = document.createElement('template');
    template.innerHTML = content;
    return template.content;
  }

  // For TemplateResult or Directive, use the lazy-loaded renderTemplate
  if (!renderTemplateRef) {
    throw new Error('[craftit] renderTemplate not initialized - internal error');
  }

  // Render it to a temp container
  const container = document.createElement('div');
  renderTemplateRef(content as TemplateResult, container);

  const fragment = document.createDocumentFragment();
  while (container.firstChild) {
    fragment.appendChild(container.firstChild);
  }

  return fragment;
}
