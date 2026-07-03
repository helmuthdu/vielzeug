/**
 * Testing - Render Utilities Tests
 * Tests for the testing utilities themselves
 */
import { signal } from '@vielzeug/ripple';

import { html, OreTimeoutError, prop } from '../index';
import { cleanup, fire, mock, mount, mountComponent, user, waitFor, waitForEvent, within } from '../testing';

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
      fire.custom(div, 'custom', { detail: 123 });
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

    it('should press a key (keydown + keyup)', async () => {
      const downSpy = vi.fn();
      const upSpy = vi.fn();
      const input = document.createElement('input');

      input.addEventListener('keydown', downSpy);
      input.addEventListener('keyup', upSpy);
      document.body.appendChild(input);
      await user.press(input, 'Enter');
      expect(downSpy).toHaveBeenCalledOnce();
      expect(upSpy).toHaveBeenCalledOnce();
      input.remove();
    });

    it('should hover and unhover an element', async () => {
      const enterSpy = vi.fn();
      const leaveSpy = vi.fn();
      const div = document.createElement('div');

      div.addEventListener('pointerenter', enterSpy);
      div.addEventListener('pointerleave', leaveSpy);
      document.body.appendChild(div);
      await user.hover(div);
      expect(enterSpy).toHaveBeenCalledOnce();
      await user.unhover(div);
      expect(leaveSpy).toHaveBeenCalledOnce();
      div.remove();
    });

    it('should double-click an element', async () => {
      const spy = vi.fn();
      const button = document.createElement('button');

      button.addEventListener('dblclick', spy);
      document.body.appendChild(button);
      await user.dblClick(button);
      expect(spy).toHaveBeenCalledOnce();
      button.remove();
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

  describe('waitForEvent', () => {
    it('resolves with the event when it fires', async () => {
      const el = document.createElement('div');
      const promise = waitForEvent<CustomEvent>(el, 'my-event');

      fire.custom(el, 'my-event', { detail: 42 });

      const event = await promise;

      expect(event.detail).toBe(42);
    });

    it('rejects with OreTimeoutError when the event never fires', async () => {
      const el = document.createElement('div');

      await expect(waitForEvent(el, 'never-fires', 50)).rejects.toBeInstanceOf(OreTimeoutError);
    });
  });

  describe('within()', () => {
    it('scopes query/queryAll to the given element', () => {
      const root = document.createElement('div');

      root.innerHTML = '<p class="a">First</p><p class="a">Second</p>';

      const { query, queryAll } = within(root);

      expect(query('.a')?.textContent).toBe('First');
      expect(queryAll('.a')).toHaveLength(2);
    });

    it('scopes queryByText/queryAllByText/queryByTestId/queryAllByTestId to the given element', () => {
      const root = document.createElement('div');

      root.innerHTML = `
        <span data-testid="label">Hello</span>
        <span data-testid="label">Hello</span>
        <span data-testid="other">World</span>
      `;

      const { queryAllByTestId, queryAllByText, queryByTestId, queryByText } = within(root);

      expect(queryByText('Hello')?.getAttribute('data-testid')).toBe('label');
      expect(queryAllByText('Hello')).toHaveLength(2);
      expect(queryByTestId('other')?.textContent).toBe('World');
      expect(queryAllByTestId('label')).toHaveLength(2);
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

  describe('Fixture — additional query helpers and lifecycle', () => {
    it('sets multiple attributes via attrs()', async () => {
      const fixture = await mount(() => html`<div>Test</div>`);

      await fixture.attrs({ 'aria-label': 'Widget', open: true });
      expect(fixture.element.getAttribute('aria-label')).toBe('Widget');
      expect(fixture.element.hasAttribute('open')).toBe(true);
    });

    it('queries by data-testid and by text content within the shadow root', async () => {
      const fixture = await mount(
        () =>
          html`<p data-testid="greeting">Hello</p>
            <p data-testid="greeting">Hello</p>
            <p>Other</p>`,
      );

      expect(fixture.queryByTestId('greeting')?.textContent).toBe('Hello');
      expect(fixture.queryAllByTestId('greeting')).toHaveLength(2);
      expect(fixture.queryByText('Other')?.tagName).toBe('P');
      expect(fixture.queryAllByText('Hello')).toHaveLength(2);
    });

    it('exposes disposed and shadow, and disposes idempotently via Symbol.dispose', async () => {
      const fixture = await mount(() => html`<div>Test</div>`);

      expect(fixture.disposed).toBe(false);
      expect(fixture.shadow).toBeInstanceOf(ShadowRoot);

      fixture[Symbol.dispose]();
      expect(fixture.disposed).toBe(true);

      // Idempotent: calling dispose again (directly or via Symbol.dispose) is a no-op.
      fixture.dispose();
      expect(fixture.disposed).toBe(true);
    });
  });

  describe('mountComponent()', () => {
    it('registers and mounts a component definition in one call', async () => {
      const { query } = await mountComponent('mount-component-demo', {
        props: { label: prop.string('hi') },
        setup: (props) => html`<span>${props.label}</span>`,
      });

      expect(query('span')?.textContent).toBe('hi');
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
