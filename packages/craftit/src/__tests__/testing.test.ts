/**
 * Testing - Render Utilities Tests
 * Tests for the testing utilities themselves
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { define, html, signal } from '..';
import {
  cleanup,
  createMockComponent,
  fireEvent,
  mount,
  userEvent,
  waitFor,
  waitForElement,
  waitForElementToBeRemoved,
} from '../testing/render';

// Counter for unique component names
let componentCounter = 0;
const uniqueName = (base: string) => `${base}-c${++componentCounter}`;

describe('Testing: Render Utilities', () => {
  afterEach(() => cleanup());

  describe('mount()', () => {
    it('should mount component', () => {
      const name = uniqueName('test-mount');
      define(name, () => html`<div>Test</div>`);
      const { element, shadow } = mount(name);

      expect(element).toBeInstanceOf(HTMLElement);
      expect(shadow).not.toBeNull();
    });

    it('should set props', () => {
      const name = uniqueName('test-props');
      define(name, () => html`<div>Test</div>`);
      const { element } = mount(name, {
        props: { disabled: true, variant: 'primary' },
      });

      expect(element.getAttribute('variant')).toBe('primary');
      expect(element.hasAttribute('disabled')).toBe(true);
    });

    it('should set innerHTML', () => {
      const name = uniqueName('slot-test');
      define(name, () => html`<slot></slot>`);
      const { element } = mount(name, {
        innerHTML: '<span>Content</span>',
      });

      expect(element.innerHTML).toContain('Content');
    });
  });

  describe('fireEvent', () => {
    it('should fire click events', () => {
      const spy = vi.fn();
      const name = uniqueName('test-click');
      define(name, () => {
        return html`<button @click=${spy}>Click</button>`;
      });

      const { query } = mount(name);
      fireEvent.click(query('button')!);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should fire input events', () => {
      const spy = vi.fn();
      const input = document.createElement('input');
      input.addEventListener('input', spy);

      fireEvent.input(input);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should fire custom events', () => {
      const spy = vi.fn();
      const div = document.createElement('div');
      div.addEventListener('custom', spy);

      fireEvent.custom(div, 'custom', { detail: { value: 123 } });
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('userEvent', () => {
    it('should type text', async () => {
      const input = document.createElement('input');
      document.body.appendChild(input);

      await userEvent.type(input, 'Hello');
      expect(input.value).toBe('Hello');

      input.remove();
    });

    it('should clear input', async () => {
      const input = document.createElement('input');
      input.value = 'initial';
      document.body.appendChild(input);

      await userEvent.clear(input);
      expect(input.value).toBe('');

      input.remove();
    });

    it('should select option', async () => {
      const select = document.createElement('select');
      select.innerHTML = '<option value="1">One</option><option value="2">Two</option>';
      document.body.appendChild(select);

      await userEvent.selectOption(select, '2');
      expect(select.value).toBe('2');

      select.remove();
    });
  });

  describe('waitFor', () => {
    it('should wait for condition', async () => {
      let ready = false;
      setTimeout(() => (ready = true), 50);

      await waitFor(() => ready);
      expect(ready).toBe(true);
    });

    it('should timeout if condition not met', async () => {
      await expect(waitFor(() => false, { timeout: 100 })).rejects.toThrow();
    });
  });

  describe('waitForElement', () => {
    it('should wait for element to appear', async () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      setTimeout(() => {
        const el = document.createElement('button');
        container.appendChild(el);
      }, 50);

      const button = await waitForElement(() => container.querySelector('button'));
      expect(button).not.toBeNull();

      container.remove();
    });
  });

  describe('waitForElementToBeRemoved', () => {
    it('should wait for element removal', async () => {
      const container = document.createElement('div');
      const el = document.createElement('div');
      container.appendChild(el);
      document.body.appendChild(container);

      setTimeout(() => el.remove(), 50);

      await waitForElementToBeRemoved(() => container.querySelector('div'));
      expect(container.querySelector('div')).toBeNull();

      container.remove();
    });
  });

  describe('createMockComponent', () => {
    it('should create mock component', () => {
      const mockName = 'mock-test-component';

      createMockComponent(mockName, () => html`<div class="mocked">Mocked</div>`);

      // Verify the component is registered
      expect(customElements.get(mockName)).toBeDefined();

      // Verify it can be created and used
      const element = document.createElement(mockName);
      document.body.appendChild(element);

      // The mock component should have rendered content in its shadow root
      expect(element.shadowRoot).toBeTruthy();

      element.remove();
    });
  });

  describe('cleanup', () => {
    it('should cleanup all mounted components', () => {
      const name1 = uniqueName('test-cleanup-1');
      const name2 = uniqueName('test-cleanup-2');

      define(name1, () => html`<div>1</div>`);
      define(name2, () => html`<div>2</div>`);

      mount(name1);
      mount(name2);

      expect(document.body.children.length).toBeGreaterThan(0);

      cleanup();
      expect(document.body.innerHTML).toBe('');
    });
  });

  describe('Integration', () => {
    it('should work with real component workflow', async () => {
      const name = uniqueName('test-workflow');
      define(name, () => {
        const count = signal(0);
        return html`
          <div>
            <span class="count">${count}</span>
            <button @click=${() => count.value++}>+</button>
          </div>
        `;
      });

      const { query, waitForUpdates } = mount(name);

      expect(query('.count')?.textContent).toBe('0');

      fireEvent.click(query('button')!);
      await waitForUpdates();

      // Wait for the count to update - return boolean condition
      await waitFor(() => query('.count')?.textContent === '1');

      // Now verify the final state
      expect(query('.count')?.textContent).toBe('1');
    });
  });
});
