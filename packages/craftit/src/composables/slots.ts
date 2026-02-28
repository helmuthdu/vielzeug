/**
 * Slots API
 * Better slot handling and management
 */

import { html, type TemplateResult } from '../template/html';

export interface SlotContent {
  name?: string;
  content: TemplateResult | string;
}

/**
 * Create a named slot
 *
 * @example
 * slot('header', html`<h1>Title</h1>`)
 */
export function slot(name: string, content?: TemplateResult | string): TemplateResult | string {
  if (content) {
    return html`<slot name="${name}">${content}</slot>`;
  }
  return html`<slot name="${name}"></slot>`;
}

/**
 * Create default slot
 */
export function defaultSlot(content?: TemplateResult | string): TemplateResult | string {
  if (content) {
    return html`<slot>${content}</slot>`;
  }
  return html`<slot></slot>`;
}

/**
 * Get slotted content from an element
 */
export function getSlottedContent(
  element: HTMLElement,
  slotName?: string
): Element[] {
  const selector = slotName ? `[slot="${slotName}"]` : ':not([slot])';
  return Array.from(element.querySelectorAll(selector));
}

/**
 * Check if slot has content
 */
export function hasSlotContent(
  shadowRoot: ShadowRoot,
  slotName?: string
): boolean {
  const slotSelector = slotName ? `slot[name="${slotName}"]` : 'slot:not([name])';
  const slotElement = shadowRoot.querySelector(slotSelector) as HTMLSlotElement;

  if (!slotElement) return false;

  const assignedNodes = slotElement.assignedNodes({ flatten: true });
  return assignedNodes.length > 0;
}

/**
 * Get assigned nodes for a slot
 */
export function getAssignedNodes(
  shadowRoot: ShadowRoot,
  slotName?: string
): Node[] {
  const slotSelector = slotName ? `slot[name="${slotName}"]` : 'slot:not([name])';
  const slotElement = shadowRoot.querySelector(slotSelector) as HTMLSlotElement;

  if (!slotElement) return [];

  return slotElement.assignedNodes({ flatten: true });
}

/**
 * Create slot with fallback content
 *
 * @example
 * slotWithFallback('header', html`<h1>Default Title</h1>`)
 */
export function slotWithFallback(
  name: string | undefined,
  fallback: TemplateResult | string
): TemplateResult | string {
  if (name) {
    return html`<slot name="${name}">${fallback}</slot>`;
  }
  return html`<slot>${fallback}</slot>`;
}

/**
 * Slot configuration helper
 */
export interface SlotConfig {
  name?: string;
  fallback?: TemplateResult | string;
  required?: boolean;
}

/**
 * Create slots from configuration
 *
 * @example
 * const slots = createSlots({
 *   header: { fallback: html`<h1>Default</h1>` },
 *   content: { required: true },
 *   footer: {}
 * });
 *
 * return html`
 *   <div class="card">
 *     ${slots.header}
 *     ${slots.content}
 *     ${slots.footer}
 *   </div>
 * `;
 */
export function createSlots<T extends Record<string, SlotConfig>>(
  config: T
): Record<keyof T, TemplateResult | string> {
  const slots = {} as Record<keyof T, TemplateResult | string>;

  for (const [name, slotConfig] of Object.entries(config)) {
    if (slotConfig.fallback) {
      slots[name as keyof T] = slotWithFallback(
        slotConfig.name || name,
        slotConfig.fallback
      );
    } else {
      slots[name as keyof T] = slot(slotConfig.name || name);
    }
  }

  return slots;
}

/**
 * Slot change event handler helper
 *
 * @example
 * onSlotChange(shadowRoot, 'header', (nodes) => {
 *   console.log('Header slot changed:', nodes);
 * });
 */
export function onSlotChange(
  shadowRoot: ShadowRoot,
  slotName: string | undefined,
  callback: (nodes: Node[]) => void
): () => void {
  const slotSelector = slotName ? `slot[name="${slotName}"]` : 'slot:not([name])';
  const slotElement = shadowRoot.querySelector(slotSelector) as HTMLSlotElement;

  if (!slotElement) {
    console.warn(`[slots] Slot "${slotName || 'default'}" not found`);
    return () => {};
  }

  const handler = () => {
    const nodes = slotElement.assignedNodes({ flatten: true });
    callback(nodes);
  };

  slotElement.addEventListener('slotchange', handler);

  // Return cleanup function
  return () => {
    slotElement.removeEventListener('slotchange', handler);
  };
}


