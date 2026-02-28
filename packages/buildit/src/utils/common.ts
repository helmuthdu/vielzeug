/**
 * Helper utilities for buildit components
 * @module buildit/helpers
 */

/**
 * Generate a unique ID for element association
 * Used for linking labels, inputs, and ARIA attributes
 *
 * @param prefix - Optional prefix for the ID
 * @returns A unique ID string
 *
 * @example
 * const id = generateId('label');
 * // Returns: 'label-abc123def'
 */
export function generateId(prefix = 'id'): string {
  return `${prefix}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Setup label association for a component with ARIA attributes
 * Eliminates repetitive label ID generation and association code
 *
 * @param shadowRoot - The component's shadow root
 * @param hostElement - The host element
 * @param componentType - Type of component (for ID prefix)
 * @returns The generated label ID
 *
 * @example
 * connectedCallback() {
 *   this.render();
 *   setupLabelAssociation(this.shadowRoot, this, 'checkbox');
 * }
 */
export function setupLabelAssociation(
  shadowRoot: ShadowRoot | null,
  hostElement: HTMLElement,
  componentType: string,
): string | null {
  const label = shadowRoot?.querySelector('.label') as HTMLElement | null;
  if (label?.textContent?.trim()) {
    const labelId = generateId(`${componentType}-label`);
    label.id = labelId;
    hostElement.setAttribute('aria-labelledby', labelId);
    return labelId;
  }
  return null;
}
