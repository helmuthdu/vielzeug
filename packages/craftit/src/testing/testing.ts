/**
 * Testing utilities for craftit web components
 * Provides helpers for testing web components built with craftit
 *
 * @module craftit/testing
 */

/**
 * Create a test container and automatically clean it up
 * @returns Container element and cleanup function
 * @example
 * const { container, cleanup } = createTestContainer();
 * container.innerHTML = '<my-component>Test</my-component>';
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
 * const el = document.createElement('my-component');
 * await attach(el);
 * // Component is now in DOM and rendered
 */
export async function attach<T extends HTMLElement>(element: T, container: HTMLElement = document.body): Promise<T> {
  container.appendChild(element);

  if ('flush' in element && typeof element.flush === 'function') {
    await element.flush();
  } else {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }

  return element;
}

/**
 * Remove a component from the DOM with cleanup
 * @param element - The element to destroy
 * @example
 * const el = await attach(document.createElement('my-component'));
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
 * const button = await createComponent('my-button', {
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
 * const fixture = await createFixture('my-button');
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
    if ('flush' in this.element && typeof this.element.flush === 'function') {
      await this.element.flush();
    } else {
      await waitForRender();
    }
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
 * const fixture = await createFixture('my-button', { variant: 'outline' });
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
