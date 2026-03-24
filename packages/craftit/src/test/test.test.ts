/**
 * Testing - Render Utilities Tests
 * Tests for the testing utilities themselves
 */
import { html, signal } from '..';
import { cleanup, fire, mock, mount, user, waitFor } from './';

describe('Testing: Render Utilities', () => {
  describe('mount()', () => {
    it('should mount component', async () => {
      const { element, shadow } = await mount(() => html`<div>Test</div>`);

      expect(element).toBeInstanceOf(HTMLElement);
      expect(shadow).not.toBeNull();
    });

    it('should set attrs', async () => {
      const { element } = await mount(() => html`<div>Test</div>`, {
        attrs: { disabled: true, variant: 'primary' },
      });

      expect(element.getAttribute('variant')).toBe('primary');
      expect(element.hasAttribute('disabled')).toBe(true);
    });

    it('should set innerHTML', async () => {
      const { element } = await mount(() => html`<slot></slot>`, {
        html: '<span>Content</span>',
      });

      expect(element.innerHTML).toContain('Content');
    });
  });

  describe('fire', () => {
    it('should fire click events', async () => {
      const spy = vi.fn();
      const { query } = await mount(() => html`<button @click=${spy}>Click</button>`);

      fire.click(query('button')!);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should fire input events', () => {
      const spy = vi.fn();
      const input = document.createElement('input');

      input.addEventListener('input', spy);
      fire.input(input);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should fire custom events', () => {
      const spy = vi.fn();
      const div = document.createElement('div');

      div.addEventListener('custom', spy);
      fire.custom(div, 'custom', { value: 123 });
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('user', () => {
    it('should type text', async () => {
      const input = document.createElement('input');

      document.body.appendChild(input);
      await user.type(input, 'Hello');
      expect(input.value).toBe('Hello');
      input.remove();
    });

    it('should fill input (clear then type)', async () => {
      const input = document.createElement('input');

      input.value = 'old';
      document.body.appendChild(input);
      await user.fill(input, 'new');
      expect(input.value).toBe('new');
      input.remove();
    });

    it('should clear input', async () => {
      const input = document.createElement('input');

      input.value = 'initial';
      document.body.appendChild(input);
      await user.clear(input);
      expect(input.value).toBe('');
      input.remove();
    });

    it('should select option', async () => {
      const select = document.createElement('select');

      select.innerHTML = '<option value="1">One</option><option value="2">Two</option>';
      document.body.appendChild(select);
      await user.select(select, '2');
      expect(select.value).toBe('2');
      select.remove();
    });
  });

  describe('waitFor', () => {
    it('should wait for boolean condition', async () => {
      let ready = false;

      setTimeout(() => (ready = true), 50);
      await waitFor(() => ready);
      expect(ready).toBe(true);
    });

    it('should wait for expect() assertion', async () => {
      let count = 0;

      setTimeout(() => count++, 50);
      await waitFor(() => expect(count).toBeGreaterThan(0));
      expect(count).toBeGreaterThan(0);
    });

    it('should timeout if condition not met', async () => {
      await expect(waitFor(() => false, { timeout: 100 })).rejects.toThrow();
    });
  });

  describe('waitFor (element appearance)', () => {
    it('should wait for element to appear', async () => {
      const container = document.createElement('div');

      document.body.appendChild(container);
      setTimeout(() => {
        const el = document.createElement('button');

        container.appendChild(el);
      }, 50);
      await waitFor(() => container.querySelector('button'));
      expect(container.querySelector('button')).not.toBeNull();
      container.remove();
    });
  });

  describe('waitFor (element removal)', () => {
    it('should wait for element removal', async () => {
      const container = document.createElement('div');
      const el = document.createElement('div');

      container.appendChild(el);
      document.body.appendChild(container);
      setTimeout(() => el.remove(), 50);
      await waitFor(() => !container.querySelector('div'));
      expect(container.querySelector('div')).toBeNull();
      container.remove();
    });
  });

  describe('mock()', () => {
    it('should register a stub custom element', () => {
      const mockName = 'mock-test-component';

      mock(mockName, '<div class="mocked">Mocked</div>');
      expect(customElements.get(mockName)).toBeDefined();

      const element = document.createElement(mockName);

      document.body.appendChild(element);
      expect(element.innerHTML).toContain('Mocked');
      element.remove();
    });
  });

  describe('cleanup()', () => {
    it('should remove all mounted components', async () => {
      await mount(() => html`<div>1</div>`);
      await mount(() => html`<div>2</div>`);
      expect(document.body.children.length).toBeGreaterThan(0);
      cleanup();
      expect(document.body.children.length).toBe(0);
    });
  });

  describe('Integration', () => {
    it('should work with real component workflow', async () => {
      const { act, query } = await mount(() => {
        const count = signal(0);

        return html`
          <div>
            <span class="count">${count}</span>
            <button @click=${() => count.value++}>+</button>
          </div>
        `;
      });

      expect(query('.count')?.textContent).toBe('0');
      await act(() => fire.click(query('button')!));
      expect(query('.count')?.textContent).toBe('1');
    });
  });
});
