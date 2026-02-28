/**
 * Slots API
 * Basic slot helpers for web components
 */

import { html, type TemplateResult } from '../template/html';

/**
 * Create a named slot
 *
 * @example
 * slot('header', html`<h1>Title</h1>`)
 */
export function slot(name: string, content?: TemplateResult | string): TemplateResult | string {
  return content ? html`<slot name="${name}">${content}</slot>` : html`<slot name="${name}"></slot>`;
}

/**
 * Create default slot
 *
 * @example
 * defaultSlot(html`<p>Fallback content</p>`)
 */
export function defaultSlot(content?: TemplateResult | string): TemplateResult | string {
  return content ? html`<slot>${content}</slot>` : html`<slot></slot>`;
}
