/**
 * Testing - Render Utilities Tests
 * Tests for the testing utilities themselves
 */
import { signal } from '@vielzeug/ripple';

import { html, prop } from '../index';
import { cleanup, fire, mock, mount, mountComponent, user } from '../testing';

describe('Testing: Render Utilities', () => {
  describe('mount()', () => {
    it('should mount component', async () => {
      const { element, shadow } = await mount(
        () => html`
          <div>Test</div>
        `,
      );

      expect(element).toBeInstanceOf(HTMLElement);
      expect(shadow).not.toBeNull();
    });

    it('should set attrs', async () => {
      const { element } = await mount(
        () => html`
          <div>Test</div>
        `,
        {
          attrs: { disabled: true, variant: 'primary' },
        },
      );

      expect(element.getAttribute('variant')).toBe('primary');
      expect(element.hasAttribute('disabled')).toBe(true);
    });

    it('should set innerHTML', async () => {
      const { element } = await mount(
        () => html`
          <slot></slot>
        `,
        {
          html: '<span>Content</span>',
        },
      );

      expect(element.innerHTML).toContain('Content');
    });

    it('removes the element from the DOM if setup throws, instead of leaking a half-mounted fixture', async () => {
      const before = document.body.childElementCount;

      await expect(
        mount(() => {
          throw new Error('boom');
        }),
      ).rejects.toThrow('boom');

      expect(document.body.childElementCount).toBe(before);
    });
  });

  describe('fire', () => {
    // fire.*'s own dispatch behavior is covered exhaustively in @vielzeug/assay's own test
    // suite (it has no ore-specific logic) — this is the one integration point worth keeping
    // here: firing against a real mounted ore component's rendered DOM.
    it('should fire click events', async () => {
      const spy = vi.fn();
      const { query } = await mount(
        () => html`
          <button @click=${spy}>Click</button>
        `,
      );

      fire.click(query('button')!);
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
      await mount(
        () => html`
          <div>1</div>
        `,
      );
      await mount(
        () => html`
          <div>2</div>
        `,
      );
      expect(document.body.children.length).toBeGreaterThan(0);
      cleanup();
      expect(document.body.children.length).toBe(0);
    });
  });

  describe('Fixture — additional query helpers and lifecycle', () => {
    it('sets multiple attributes via attrs()', async () => {
      const fixture = await mount(
        () => html`
          <div>Test</div>
        `,
      );

      await fixture.attrs({ 'aria-label': 'Widget', open: true });
      expect(fixture.element.getAttribute('aria-label')).toBe('Widget');
      expect(fixture.element.hasAttribute('open')).toBe(true);
    });

    it('queries by data-testid and by text content within the shadow root', async () => {
      const fixture = await mount(
        () => html`
          <p data-testid="greeting">Hello</p>
          <p data-testid="greeting">Hello</p>
          <p>Other</p>
        `,
      );

      expect(fixture.queryByTestId('greeting')?.textContent).toBe('Hello');
      expect(fixture.queryAllByTestId('greeting')).toHaveLength(2);
      expect(fixture.queryByText('Other')?.tagName).toBe('P');
      expect(fixture.queryAllByText('Hello')).toHaveLength(2);
    });

    it('exposes disposed and shadow, and disposes idempotently via Symbol.dispose', async () => {
      const fixture = await mount(
        () => html`
          <div>Test</div>
        `,
      );

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
        setup: (props) => html`
          <span>${props.label}</span>
        `,
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
