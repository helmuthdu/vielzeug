/**
 * Testing utilities for buildit web components
 * Provides helpers for testing web components
 *
 * @module buildit/trial
 */

/**
 * Create a test container and automatically clean it up
 * @returns Container element and cleanup function
 * @example
 * const { container, cleanup } = createTestContainer();
 * container.innerHTML = '<bit-button>Test</bit-button>';
 * // ... test code ...
 * cleanup();
 */
export function createTestContainer(): {
  container: HTMLElement;
  cleanup: () => void;
} {
  const container = document.createElement('div');
  container.setAttribute('data-testid', 'test-container');
  document.body.appendChild(container);

  return {
    cleanup: () => container.remove(),
    container,
  };
}

/**
 * Attach/mount a component to the DOM and wait for first render
 * @param element - The element to attach
 * @param container - Optional container (defaults to document.body)
 * @returns Promise that resolves when component is mounted and rendered
 * @example
 * const el = document.createElement('bit-button');
 * await attach(el);
 * // Component is now in DOM and rendered
 */
export async function attach<T extends HTMLElement>(element: T, container: HTMLElement = document.body): Promise<T> {
  container.appendChild(element);
  await new Promise((resolve) => requestAnimationFrame(resolve));
  return element;
}

/**
 * Remove a component from the DOM with cleanup
 * @param element - The element to destroy
 * @example
 * const el = await attach(document.createElement('bit-button'));
 * // ... test code ...
 * destroy(el); // Clean removal
 */
export function destroy(element: HTMLElement): void {
  element.remove();
}

/**
 * Create and attach a component to the DOM
 * Waits for component to be fully rendered
 * @param tagName - Component tag name
 * @param attributes - Optional attributes to set
 * @param container - Optional container (defaults to document.body)
 * @returns The attached component element
 * @example
 * const button = await createComponent('bit-button', {
 *   variant: 'outline',
 *   disabled: true
 * });
 */
export async function createComponent<T extends HTMLElement = HTMLElement>(
  tagName: string,
  attributes: Record<string, string | boolean> = {},
  container: HTMLElement = document.body,
): Promise<T> {
  const element = document.createElement(tagName) as T;

  // Set attributes
  for (const [key, value] of Object.entries(attributes)) {
    if (typeof value === 'boolean') {
      if (value) {
        element.setAttribute(key, '');
      }
    } else {
      element.setAttribute(key, value);
    }
  }

  await attach(element, container);
  return element;
}

/**
 * Wait for the next animation frame
 * Useful for waiting for component re-renders
 * @example
 * button.setAttribute('variant', 'outline');
 * await waitForRender();
 * expect(button.getAttribute('variant')).toBe('outline');
 */
export async function waitForRender(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

/**
 * Wait for multiple animation frames
 * @param frames - Number of frames to wait
 * @example
 * await waitForFrames(2);
 */
export async function waitForFrames(frames = 1): Promise<void> {
  for (let i = 0; i < frames; i++) {
    await waitForRender();
  }
}

/**
 * Query element in shadow DOM
 * @param host - Shadow host element
 * @param selector - CSS selector
 * @returns Found element or null
 * @example
 * const innerButton = queryShadow(myComponent, 'button');
 */
export function queryShadow<T extends Element = Element>(host: Element, selector: string): T | null {
  return (host.shadowRoot?.querySelector(selector) as T) || null;
}

/**
 * Query all elements in shadow DOM
 * @param host - Shadow host element
 * @param selector - CSS selector
 * @returns NodeList of found elements
 * @example
 * const slots = queryShadowAll(myComponent, 'slot');
 */
export function queryShadowAll<T extends Element = Element>(host: Element, selector: string): NodeListOf<T> {
  return (host.shadowRoot?.querySelectorAll(selector) as NodeListOf<T>) || ([] as unknown as NodeListOf<T>);
}

/**
 * Set multiple attributes on an element
 * @param element - Target element
 * @param attributes - Attributes to set (null or false removes attribute)
 * @example
 * setAttributes(button, { variant: 'outline', disabled: true, loading: null });
 */
export function setAttributes(element: Element, attributes: Record<string, string | boolean | null>): void {
  for (const [key, value] of Object.entries(attributes)) {
    if (value === null || value === false) {
      element.removeAttribute(key);
    } else if (value === true) {
      element.setAttribute(key, '');
    } else {
      element.setAttribute(key, value);
    }
  }
}

/**
 * Wait for an element to have specific attribute value
 * @param element - Element to watch
 * @param attribute - Attribute name
 * @param value - Expected value (or null to check for removal)
 * @param timeout - Max wait time in ms
 * @example
 * await waitForAttribute(button, 'disabled', null); // Wait for disabled to be removed
 */
export async function waitForAttribute(
  element: Element,
  attribute: string,
  value: string | null,
  timeout = 1000,
): Promise<void> {
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const check = () => {
      const current = element.getAttribute(attribute);

      if (current === value) {
        resolve();
        return;
      }

      if (Date.now() - startTime > timeout) {
        reject(new Error(`Timeout waiting for attribute ${attribute} to be ${value}`));
        return;
      }

      requestAnimationFrame(check);
    };

    check();
  });
}

/**
 * User interaction utilities for simulating user events
 * Provides a unified API for common user interactions
 *
 * @example
 * await userEvent.click(button);
 * await userEvent.type(input, 'Hello');
 * await userEvent.keyboard(input, 'Enter');
 */
export const userEvent = {
  /**
   * Simulate blur on an element
   * @param element - Element to blur
   * @example
   * await userEvent.blur(input);
   */
  async blur(element: Element): Promise<void> {
    if (element instanceof HTMLElement) {
      element.blur();
      const event = new FocusEvent('blur', { bubbles: true });
      element.dispatchEvent(event);
      await waitForRender();
    }
  },

  /**
   * Clear an input element
   * @param element - Input element to clear
   * @example
   * await userEvent.clear(input);
   */
  async clear(element: Element): Promise<void> {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      element.value = '';
      const inputEvent = new Event('input', { bubbles: true });
      element.dispatchEvent(inputEvent);
      await waitForRender();
    }
  },
  /**
   * Simulate a click event on an element
   * @param element - Element to click
   * @param options - Optional MouseEvent init options
   * @example
   * await userEvent.click(button);
   * await userEvent.click(button, { ctrlKey: true });
   */
  async click(element: Element, options: MouseEventInit = {}): Promise<void> {
    const event = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      ...options,
    });
    element.dispatchEvent(event);
    await waitForRender();
  },

  /**
   * Simulate a double click event
   * @param element - Element to double click
   * @param options - Optional MouseEvent init options
   * @example
   * await userEvent.dblClick(button);
   */
  async dblClick(element: Element, options: MouseEventInit = {}): Promise<void> {
    const event = new MouseEvent('dblclick', {
      bubbles: true,
      cancelable: true,
      ...options,
    });
    element.dispatchEvent(event);
    await waitForRender();
  },

  /**
   * Simulate focus on an element
   * @param element - Element to focus
   * @example
   * await userEvent.focus(input);
   */
  async focus(element: Element): Promise<void> {
    if (element instanceof HTMLElement) {
      element.focus();
      const event = new FocusEvent('focus', { bubbles: true });
      element.dispatchEvent(event);
      await waitForRender();
    }
  },

  /**
   * Simulate hover (mouseenter) on an element
   * @param element - Element to hover
   * @example
   * await userEvent.hover(button);
   */
  async hover(element: Element): Promise<void> {
    const event = new MouseEvent('mouseenter', {
      bubbles: true,
      cancelable: true,
    });
    element.dispatchEvent(event);
    await waitForRender();
  },

  /**
   * Simulate keyboard keydown event
   * @param element - Target element
   * @param key - Key name (e.g., 'Enter', 'Escape', 'a')
   * @param options - Optional KeyboardEvent init options
   * @example
   * await userEvent.keyboard(input, 'Enter');
   * await userEvent.keyboard(input, 'Tab', { shiftKey: true });
   */
  async keyboard(element: Element, key: string, options: KeyboardEventInit = {}): Promise<void> {
    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key,
      ...options,
    });
    element.dispatchEvent(event);
    await waitForRender();
  },

  /**
   * Type text into an input element
   * Simulates individual keydown events for each character
   * @param element - Input element
   * @param text - Text to type
   * @param options - Optional KeyboardEvent init options
   * @example
   * await userEvent.type(input, 'Hello World');
   */
  async type(element: Element, text: string, options: KeyboardEventInit = {}): Promise<void> {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      for (const char of text) {
        const keydownEvent = new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          key: char,
          ...options,
        });
        element.dispatchEvent(keydownEvent);

        // Update the value
        element.value += char;

        // Dispatch input event
        const inputEvent = new Event('input', { bubbles: true });
        element.dispatchEvent(inputEvent);

        await waitForRender();
      }
    }
  },

  /**
   * Simulate unhover (mouseleave) on an element
   * @param element - Element to unhover
   * @example
   * await userEvent.unhover(button);
   */
  async unhover(element: Element): Promise<void> {
    const event = new MouseEvent('mouseleave', {
      bubbles: true,
      cancelable: true,
    });
    element.dispatchEvent(event);
    await waitForRender();
  },
};

/**
 * Wait for an element to emit a specific event
 * @param element - Element to listen to
 * @param eventName - Event name
 * @param timeout - Max wait time in ms
 * @returns Event that was emitted
 * @example
 * const clickPromise = waitForEvent(button, 'click');
 * button.click();
 * const event = await clickPromise;
 */
export function waitForEvent<T extends Event = Event>(element: Element, eventName: string, timeout = 1000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      element.removeEventListener(eventName, handler as EventListener);
      reject(new Error(`Timeout waiting for event ${eventName}`));
    }, timeout);

    const handler = (event: T) => {
      clearTimeout(timeoutId);
      element.removeEventListener(eventName, handler as EventListener);
      resolve(event);
    };

    element.addEventListener(eventName, handler as EventListener);
  });
}

/**
 * Check if an element has specific CSS class in shadow DOM
 * @param host - Shadow host element
 * @param selector - Element selector in shadow DOM
 * @param className - Class name to check
 * @example
 * expect(hasShadowClass(myComponent, 'button', 'active')).toBe(true);
 */
export function hasShadowClass(host: Element, selector: string, className: string): boolean {
  const element = queryShadow(host, selector);
  return element?.classList.contains(className) || false;
}

/**
 * Get computed style of element in shadow DOM
 * @param host - Shadow host element
 * @param selector - Element selector in shadow DOM
 * @param property - CSS property name
 * @example
 * const color = getShadowStyle(myComponent, 'button', 'color');
 */
export function getShadowStyle(host: Element, selector: string, property: string): string {
  const element = queryShadow(host, selector);
  if (!element) return '';
  return window.getComputedStyle(element).getPropertyValue(property);
}

/**
 * Test fixture for component testing
 * Manages component lifecycle and cleanup
 * @example
 * const fixture = await createFixture('bit-button');
 * fixture.element.setAttribute('variant', 'outline');
 * await fixture.update();
 * // ... assertions ...
 * fixture.destroy();
 */
export class ComponentFixture<T extends HTMLElement = HTMLElement> {
  public element: T;
  private container: HTMLElement;

  constructor(element: T, container: HTMLElement) {
    this.element = element;
    this.container = container;
  }

  /**
   * Wait for the component to re-render
   */
  async update(): Promise<void> {
    await waitForRender();
  }

  /**
   * Query element in the component's shadow DOM
   */
  query<E extends Element = Element>(selector: string): E | null {
    return queryShadow<E>(this.element, selector);
  }

  /**
   * Query all elements in component's shadow DOM
   */
  queryAll<E extends Element = Element>(selector: string): NodeListOf<E> {
    return queryShadowAll<E>(this.element, selector);
  }

  /**
   * Set attributes and wait for update
   */
  async setAttribute(name: string, value: string | boolean): Promise<void> {
    if (typeof value === 'boolean') {
      if (value) {
        this.element.setAttribute(name, '');
      } else {
        this.element.removeAttribute(name);
      }
    } else {
      this.element.setAttribute(name, value);
    }
    await this.update();
  }

  /**
   * Set multiple attributes and wait for update
   */
  async setAttributes(attributes: Record<string, string | boolean>): Promise<void> {
    setAttributes(this.element, attributes);
    await this.update();
  }

  /**
   * Cleanup component and container
   */
  destroy(): void {
    destroy(this.element);
    this.container.remove();
  }
}

/**
 * Create a test fixture for a component
 * @param tagName - Component tag name
 * @param attributes - Optional initial attributes
 * @returns Component fixture
 * @example
 * const fixture = await createFixture('bit-button', { variant: 'outline' });
 * expect(fixture.element.getAttribute('variant')).toBe('outline');
 * fixture.destroy();
 */
export async function createFixture<T extends HTMLElement = HTMLElement>(
  tagName: string,
  attributes: Record<string, string | boolean> = {},
): Promise<ComponentFixture<T>> {
  const container = document.createElement('div');
  document.body.appendChild(container);

  const element = await createComponent<T>(tagName, attributes, container);

  return new ComponentFixture<T>(element, container);
}

/**
 * Form Testing Utilities
 * Helpers for testing form components and validation
 */
export const formUtils = {
  /**
   * Get form that owns an element
   * @param element - Form field element
   * @example
   * const form = formUtils.getForm(input);
   */
  getForm(element: HTMLElement): HTMLFormElement | null {
    if ('form' in element && element.form instanceof HTMLFormElement) {
      return element.form;
    }
    return element.closest('form');
  },
  /**
   * Get form data from a form element
   * @param form - Form element
   * @returns FormData object as plain object
   * @example
   * const data = formUtils.getFormData(form);
   * expect(data.username).toBe('john');
   */
  getFormData(form: HTMLFormElement): Record<string, FormDataEntryValue> {
    const formData = new FormData(form);
    const data: Record<string, FormDataEntryValue> = {};

    for (const [key, value] of formData.entries()) {
      data[key] = value;
    }

    return data;
  },

  /**
   * Get validation message from form field
   * @param element - Form field element
   * @example
   * const message = formUtils.getValidationMessage(input);
   */
  getValidationMessage(element: HTMLElement): string {
    if ('validationMessage' in element) {
      return (element as unknown as { validationMessage?: string }).validationMessage || '';
    }
    return '';
  },

  /**
   * Check if form field has specific validity state
   * @param element - Form field element
   * @param state - Validity state property
   * @example
   * expect(formUtils.hasValidityState(input, 'valueMissing')).toBe(true);
   */
  hasValidityState(element: HTMLElement, state: keyof ValidityState): boolean {
    if ('validity' in element) {
      const validity = (element as unknown as { validity?: ValidityState }).validity;
      return validity?.[state] === true;
    }
    return false;
  },

  /**
   * Check if the element is form-associated
   * @param element - Element to check
   * @example
   * expect(formUtils.isFormAssociated(input)).toBe(true);
   */
  isFormAssociated(element: HTMLElement): boolean {
    return 'form' in element && element instanceof HTMLElement;
  },

  /**
   * Check if the form field is valid
   * @param element - Form field element
   * @example
   * expect(formUtils.isValid(input)).toBe(true);
   */
  isValid(element: HTMLElement): boolean {
    if ('validity' in element) {
      return (element as unknown as { validity?: ValidityState }).validity?.valid === true;
    }
    return true;
  },

  /**
   * Trigger form validation with UI feedback
   * @param element - Form field element
   * @returns Validation result
   * @example
   * const valid = await formUtils.reportValidity(input);
   */
  async reportValidity(element: HTMLElement): Promise<boolean> {
    let result = true;

    if (
      'reportValidity' in element &&
      typeof (element as unknown as { reportValidity?: () => boolean }).reportValidity === 'function'
    ) {
      result = (element as unknown as { reportValidity: () => boolean }).reportValidity();
    }

    await waitForRender();
    return result;
  },

  /**
   * Reset form and wait for update
   * @param form - Form element
   * @example
   * await formUtils.reset(form);
   */
  async reset(form: HTMLFormElement): Promise<void> {
    form.reset();
    await waitForRender();
  },

  /**
   * Set custom validity message
   * @param element - Form field element
   * @param message - Validation message
   * @example
   * formUtils.setValidity(input, 'Username is taken');
   */
  setValidity(element: HTMLElement, message: string): void {
    if (
      'setCustomValidity' in element &&
      typeof (element as unknown as { setCustomValidity?: (message: string) => void }).setCustomValidity === 'function'
    ) {
      (element as unknown as { setCustomValidity: (message: string) => void }).setCustomValidity(message);
    }
  },

  /**
   * Submit form and wait for event
   * @param form - Form element
   * @returns Submit event
   * @example
   * const event = await formUtils.submit(form);
   */
  async submit(form: HTMLFormElement): Promise<SubmitEvent> {
    const submitPromise = waitForEvent<SubmitEvent>(form, 'submit');
    form.requestSubmit();
    return submitPromise;
  },

  /**
   * Trigger form validation on element
   * @param element - Form field element
   * @returns Validation result
   * @example
   * const valid = await formUtils.validate(input);
   */
  async validate(element: HTMLElement): Promise<boolean> {
    let result = true;

    if (
      'checkValidity' in element &&
      typeof (element as unknown as { checkValidity?: () => boolean }).checkValidity === 'function'
    ) {
      result = (element as unknown as { checkValidity: () => boolean }).checkValidity();
    }

    await waitForRender();
    return result;
  },
};

/**
 * Accessibility Testing Utilities
 * Helpers for testing ARIA attributes and accessibility
 */
export const a11yUtils = {
  /**
   * Check if element has accessible description
   * @param element - Element to check
   * @returns Accessible description or empty string
   * @example
   * expect(a11yUtils.getAccessibleDescription(input)).toBe('Must be at least 8 characters');
   */
  getAccessibleDescription(element: HTMLElement): string {
    const describedBy = element.getAttribute('aria-describedby');
    if (!describedBy) return '';

    const ids = describedBy.split(/\s+/);
    const descriptions = ids
      .map((id) => document.getElementById(id)?.textContent?.trim())
      .filter((text): text is string => Boolean(text));

    return descriptions.join(' ');
  },
  /**
   * Check if element has accessible name
   * @param element - Element to check
   * @returns Accessible name or empty string
   * @example
   * expect(a11yUtils.getAccessibleName(button)).toBe('Submit');
   */
  getAccessibleName(element: HTMLElement): string {
    // Check aria-label
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;

    // Check aria-labelledby
    const labelledBy = element.getAttribute('aria-labelledby');
    if (labelledBy) {
      const labelElement = document.getElementById(labelledBy);
      if (labelElement) return labelElement.textContent?.trim() || '';
    }

    // Check for associated label
    if (element.id) {
      const label = document.querySelector(`label[for="${element.id}"]`);
      if (label) return label.textContent?.trim() || '';
    }

    // Fallback to text content for buttons
    if (element.tagName === 'BUTTON' || element.getAttribute('role') === 'button') {
      return element.textContent?.trim() || '';
    }

    return '';
  },

  /**
   * Get ARIA properties from element
   * @param element - Element to check
   * @returns Object with all aria-* attributes
   * @example
   * const aria = a11yUtils.getAriaProperties(element);
   * expect(aria['aria-expanded']).toBe('true');
   */
  getAriaProperties(element: HTMLElement): Record<string, string> {
    const aria: Record<string, string> = {};

    for (const attr of element.attributes) {
      if (attr.name.startsWith('aria-')) {
        aria[attr.name] = attr.value;
      }
    }

    return aria;
  },

  /**
   * Get keyboard shortcuts for element
   * @param element - Element to check
   * @returns Array of keyboard shortcuts
   * @example
   * const shortcuts = a11yUtils.getKeyboardShortcuts(button);
   */
  getKeyboardShortcuts(element: HTMLElement): string[] {
    const accessKey = element.getAttribute('accesskey');
    return accessKey ? [accessKey] : [];
  },

  /**
   * Check if element has valid ARIA state
   * @param element - Element to check
   * @param state - ARIA state name (without 'aria-' prefix)
   * @param expectedValue - Expected value
   * @example
   * expect(a11yUtils.hasAriaState(toggle, 'pressed', 'true')).toBe(true);
   */
  hasAriaState(element: HTMLElement, state: string, expectedValue: string): boolean {
    const value = element.getAttribute(`aria-${state}`);
    return value === expectedValue;
  },

  /**
   * Check if element has proper ARIA role
   * @param element - Element to check
   * @param expectedRole - Expected role
   * @example
   * expect(a11yUtils.hasRole(button, 'button')).toBe(true);
   */
  hasRole(element: HTMLElement, expectedRole: string): boolean {
    const role = element.getAttribute('role') || element.tagName.toLowerCase();
    return role === expectedRole || element.getAttribute('role') === expectedRole;
  },

  /**
   * Check if element is semantically disabled
   * @param element - Element to check
   * @example
   * expect(a11yUtils.isDisabled(button)).toBe(true);
   */
  isDisabled(element: HTMLElement): boolean {
    return element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true';
  },

  /**
   * Check if element is focusable
   * @param element - Element to check
   * @example
   * expect(a11yUtils.isFocusable(button)).toBe(true);
   */
  isFocusable(element: HTMLElement): boolean {
    // Check if element is disabled
    if (element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true') {
      return false;
    }

    // Check tabindex
    const tabindex = element.getAttribute('tabindex');
    if (tabindex !== null) {
      return Number.parseInt(tabindex, 10) >= 0;
    }

    // Check if natively focusable
    const focusableTags = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'];
    return focusableTags.includes(element.tagName);
  },

  /**
   * Check if element is in tab order
   * @param element - Element to check
   * @example
   * expect(a11yUtils.isInTabOrder(button)).toBe(true);
   */
  isInTabOrder(element: HTMLElement): boolean {
    if (!this.isFocusable(element)) return false;

    const tabindex = element.getAttribute('tabindex');
    return tabindex === null || Number.parseInt(tabindex, 10) >= 0;
  },

  /**
   * Check if element is invalid
   * @param element - Element to check
   * @example
   * expect(a11yUtils.isInvalid(input)).toBe(true);
   */
  isInvalid(element: HTMLElement): boolean {
    return element.getAttribute('aria-invalid') === 'true';
  },

  /**
   * Check if element is required for forms
   * @param element - Element to check
   * @example
   * expect(a11yUtils.isRequired(input)).toBe(true);
   */
  isRequired(element: HTMLElement): boolean {
    return element.hasAttribute('required') || element.getAttribute('aria-required') === 'true';
  },
};
