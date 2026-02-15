import type { WebComponent } from './craftit';
import { attach, classMap, css, defineElement, destroy, html, styleMap } from './craftit';

describe('craftit', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  describe('Utility Functions', () => {
    describe('html', () => {
      it('should interpolate template strings', () => {
        const name = 'Alice';
        const age = 30;
        const result = html`<div>Name: ${name}, Age: ${age}</div>`;
        expect(result).toBe('<div>Name: Alice, Age: 30</div>');
      });

      it('should handle empty values', () => {
        const result = html`<div>${undefined} ${null} ${''}</div>`;
        expect(result).toBe('<div>  </div>');
      });
    });

    describe('css', () => {
      it('should interpolate CSS template strings', () => {
        const color = 'red';
        const result = css`
          color: ${color};
        `;
        expect(result).toContain('color: red');
      });

      it('should handle empty values', () => {
        const result = css`color: ${undefined};`;
        expect(result).toBe('color: ;');
      });

      describe('css.var', () => {
        it('should create var() reference', () => {
          const result = css.var('primaryColor');
          expect(result).toBe('var(--primary-color)');
        });

        it('should create var() with fallback', () => {
          const result = css.var('fontSize', '14px');
          expect(result).toBe('var(--font-size, 14px)');
        });

        it('should handle existing -- prefix', () => {
          const result = css.var('--custom-color');
          expect(result).toBe('var(--custom-color)');
        });

        it('should handle numeric fallback', () => {
          const result = css.var('zIndex', 10);
          expect(result).toBe('var(--z-index, 10)');
        });
      });
    });

    describe('css.theme', () => {
      describe('single theme', () => {
        it('should create theme object with typed properties', () => {
          const theme = css.theme({
            primaryColor: '#3b82f6',
            textColor: '#1f2937',
          });

          expect(theme.primaryColor).toBe('var(--primary-color)');
          expect(theme.textColor).toBe('var(--text-color)');
        });

        it('should convert to CSS rule via toString()', () => {
          const theme = css.theme({
            primaryColor: '#3b82f6',
            spacing: '1rem',
          });

          const result = theme.toString();
          expect(result).toBe(':host { --primary-color: #3b82f6; --spacing: 1rem; }');
        });

        it('should work in template literal (implicit toString)', () => {
          const theme = css.theme({ bgColor: '#fff' });
          const styles = css`
            ${theme}
            .card { background: ${theme.bgColor}; }
          `;

          expect(styles).toContain(':host { --bg-color: #fff; }');
          expect(styles).toContain('background: var(--bg-color)');
        });

        it('should accept custom selector', () => {
          const theme = css.theme({ color: '#000' }, undefined, { selector: '.custom' });
          expect(theme.toString()).toBe('.custom { --color: #000; }');
        });

        it('should handle existing -- prefix', () => {
          const theme = css.theme({
            '--custom-var': '#000',
            normalVar: '#fff',
          });

          expect(theme['--custom-var']).toBe('var(--custom-var)');
          expect(theme.normalVar).toBe('var(--normal-var)');
        });

        it('should handle empty theme', () => {
          const theme = css.theme({});
          expect(theme.toString()).toBe(':host {  }');
        });

        it('should return undefined for non-existent properties', () => {
          const theme = css.theme({ color: '#000' });
          // biome-ignore lint/suspicious/noExplicitAny: -
          expect((theme as any).nonExistent).toBeUndefined();
        });
      });

      describe('light/dark theme', () => {
        it('should create theme with same variable references for both modes', () => {
          const theme = css.theme({ bg: '#fff', primaryColor: '#3b82f6' }, { bg: '#000', primaryColor: '#60a5fa' });

          // Same variable references work for both light and dark
          // CSS handles which theme applies based on media query or attribute
          expect(theme.primaryColor).toBe('var(--primary-color)');
          expect(theme.bg).toBe('var(--bg)');
        });

        it('should generate CSS with media queries', () => {
          const theme = css.theme({ bg: '#fff', primaryColor: '#3b82f6' }, { bg: '#000', primaryColor: '#60a5fa' });

          const result = theme.toString();

          expect(result).toContain(':host { --bg: #fff; --primary-color: #3b82f6; }');
          expect(result).toContain('@media (prefers-color-scheme: dark)');
          expect(result).toContain(':host:not([data-theme="light"]) { --bg: #000; --primary-color: #60a5fa; }');
          expect(result).toContain(':host[data-theme="dark"] { --bg: #000; --primary-color: #60a5fa; }');
          expect(result).toContain(':host[data-theme="light"] { --bg: #fff; --primary-color: #3b82f6; }');
        });

        it('should work in template literal', () => {
          const theme = css.theme({ color: '#000' }, { color: '#fff' });

          const styles = css`
            ${theme}
            .button {
              color: ${theme.color};
            }
          `;

          expect(styles).toContain('@media (prefers-color-scheme: dark)');
          expect(styles).toContain('var(--color)');
        });

        it('should accept custom selector', () => {
          const theme = css.theme({ color: '#000' }, { color: '#fff' }, { selector: '.custom' });

          const result = theme.toString();
          expect(result).toContain('.custom { --color: #000; }');
          expect(result).toContain('.custom:not([data-theme="light"])');
        });

        it('should accept custom attribute', () => {
          const theme = css.theme({ color: '#000' }, { color: '#fff' }, { attribute: 'theme' });

          const result = theme.toString();
          expect(result).toContain('[theme="dark"]');
          expect(result).toContain('[theme="light"]');
          expect(result).toContain(':not([theme="light"])');
        });

        it('should provide autocomplete for all properties', () => {
          const theme = css.theme(
            { primaryColor: '#3b82f6', secondaryColor: '#8b5cf6', spacing: '1rem' },
            { primaryColor: '#60a5fa', secondaryColor: '#a78bfa', spacing: '1rem' },
          );

          // All properties work the same way - CSS handles light/dark
          const primary: string = theme.primaryColor;
          const secondary: string = theme.secondaryColor;
          const spacing: string = theme.spacing;

          expect(primary).toBe('var(--primary-color)');
          expect(secondary).toBe('var(--secondary-color)');
          expect(spacing).toBe('var(--spacing)');
        });
      });
    });

    describe('css + theme integration', () => {
      it('should work with single theme and autocomplete', () => {
        const theme = css.theme({
          primaryColor: '#3b82f6',
          spacing: '1rem',
        });

        const styles = css`
          ${theme}
          .button {
            color: ${theme.primaryColor};
            padding: ${theme.spacing};
          }
        `;

        expect(styles).toContain(':host { --primary-color: #3b82f6; --spacing: 1rem; }');
        expect(styles).toContain('var(--primary-color)');
        expect(styles).toContain('var(--spacing)');
      });

      it('should work with light/dark theme and autocomplete', () => {
        const theme = css.theme({ bg: '#fff', text: '#000' }, { bg: '#000', text: '#fff' });

        const styles = css`
          ${theme}
          .card {
            background: ${theme.bg};
            color: ${theme.text};
          }
        `;

        expect(styles).toContain('@media (prefers-color-scheme: dark)');
        expect(styles).toContain('var(--bg)');
        expect(styles).toContain('var(--text)');
      });

      it('should allow fallback via css.var when needed', () => {
        const theme = css.theme({ primaryColor: '#3b82f6' });

        const styles = css`
          ${theme}
          .button {
            color: ${theme.primaryColor};
            background: ${css.var('externalVar', '#fff')};
          }
        `;

        expect(styles).toContain('var(--primary-color)');
        expect(styles).toContain('var(--external-var, #fff)');
      });
    });

    describe('classMap', () => {
      it('should return active classes', () => {
        const result = classMap({ active: true, disabled: false });
        expect(result).toBe('active');
      });

      it('should handle empty object', () => {
        const result = classMap({});
        expect(result).toBe('');
      });
    });

    describe('styleMap', () => {
      it('should convert object to style string', () => {
        const result = styleMap({ color: 'red', fontSize: '16px' });
        expect(result).toBe('color: red; font-size: 16px');
      });

      it('should convert camelCase to kebab-case', () => {
        const result = styleMap({ backgroundColor: 'blue' });
        expect(result).toBe('background-color: blue');
      });
    });
  });

  describe('Component Creation', () => {
    it('should create a basic component', async () => {
      defineElement('test-basic', {
        template: html`<div>Hello World</div>`,
      });

      const el = document.createElement('test-basic') as WebComponent;
      await attach(el, container);

      expect(el.shadow.querySelector('div')?.textContent).toBe('Hello World');
    });

    it('should create component with state', async () => {
      defineElement('test-state', {
        state: { count: 0 },
        template: (el) => html`<div>Count: ${el.state.count}</div>`,
      });

      const el = document.createElement('test-state') as WebComponent<HTMLElement, { count: number }>;
      await attach(el, container);

      expect(el.shadow.querySelector('div')?.textContent).toBe('Count: 0');
    });

    it('should warn when defining duplicate element', () => {
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      defineElement('test-dup1', { template: html`<div>First</div>` });
      defineElement('test-dup1', { template: html`<div>Second</div>` });

      expect(consoleWarn).toHaveBeenCalled();
      consoleWarn.mockRestore();
    });
  });

  describe('State Management', () => {
    it('should update state and trigger re-render', async () => {
      defineElement('test-update', {
        state: { count: 0 },
        template: (el) => html`<div class="count">${el.state.count}</div>`,
      });

      const el = document.createElement('test-update') as WebComponent<HTMLElement, { count: number }>;
      await attach(el, container);

      expect(el.find('.count')?.textContent).toBe('0');

      el.state.count = 5;
      await el.flush();

      expect(el.find('.count')?.textContent).toBe('5');
    });

    it('should handle set() with patch object', async () => {
      defineElement('test-set', {
        state: { age: 30, name: 'Alice' },
        template: (el) => html`<div>${el.state.name}</div>`,
      });

      const el = document.createElement('test-set') as WebComponent<HTMLElement, { name: string; age: number }>;
      await attach(el, container);

      await el.set({ name: 'Bob' });

      expect(el.state.name).toBe('Bob');
      expect(el.state.age).toBe(30);
    });

    it('should handle set() with updater function', async () => {
      defineElement('test-updater', {
        state: { count: 0 },
        template: (el) => html`<div>${el.state.count}</div>`,
      });

      const el = document.createElement('test-updater') as WebComponent<HTMLElement, { count: number }>;
      await attach(el, container);

      await el.set((state) => ({ count: state.count + 10 }));

      expect(el.state.count).toBe(10);
    });

    it('should replace state when replace option is true', async () => {
      defineElement('test-replace', {
        state: { age: 30, name: 'Alice' },
        template: (el) => html`<div>${el.state.name}</div>`,
      });

      const el = document.createElement('test-replace') as WebComponent<HTMLElement, { name?: string; age?: number }>;
      await attach(el, container);

      await el.set({ name: 'Bob' }, { replace: true });

      expect(el.state.name).toBe('Bob');
      expect(el.state.age).toBeUndefined();
    });

    it('should not trigger render when silent is true', async () => {
      let renderCount = 0;
      defineElement('test-silent', {
        onUpdated: () => renderCount++,
        state: { count: 0 },
        template: (el) => html`<div>${el.state.count}</div>`,
      });

      const el = document.createElement('test-silent') as WebComponent<HTMLElement, { count: number }>;
      await attach(el, container);

      const initial = renderCount;

      await el.set({ count: 5 }, { silent: true });

      expect(el.state.count).toBe(5);
      expect(renderCount).toBe(initial);
    });

    it('should handle nested state', async () => {
      defineElement('test-nested', {
        state: { user: { name: 'Alice' } },
        template: (el) => html`<div>${el.state.user.name}</div>`,
      });

      const el = document.createElement('test-nested') as WebComponent<HTMLElement, { user: { name: string } }>;
      await attach(el, container);

      el.state.user.name = 'Bob';
      await el.flush();

      expect(el.find('div')?.textContent).toBe('Bob');
    });
  });

  describe('Watchers', () => {
    it('should watch state changes', async () => {
      defineElement('test-watch', {
        state: { count: 0 },
        template: (el) => html`<div>${el.state.count}</div>`,
      });

      const el = document.createElement('test-watch') as WebComponent<HTMLElement, { count: number }>;
      await attach(el, container);

      const values: number[] = [];
      el.watch(
        (state) => state.count,
        (val) => values.push(val),
      );

      el.state.count = 1;
      await el.flush();

      expect(values).toContain(1);
    });

    it('should unwatch when unsubscribe is called', async () => {
      defineElement('test-unwatch', {
        state: { count: 0 },
        template: (el) => html`<div>${el.state.count}</div>`,
      });

      const el = document.createElement('test-unwatch') as WebComponent<HTMLElement, { count: number }>;
      await attach(el, container);

      let callCount = 0;
      const unwatch = el.watch(
        (state) => state.count,
        () => callCount++,
      );

      el.state.count = 1;
      await el.flush();

      unwatch();

      el.state.count = 2;
      await el.flush();

      expect(callCount).toBe(2);
    });
  });

  describe('DOM Queries', () => {
    it('should find single element', async () => {
      defineElement('test-find', {
        template: html`<div class="target">Found</div>`,
      });

      const el = document.createElement('test-find') as WebComponent;
      await attach(el, container);

      const target = el.find('.target');
      expect(target?.textContent).toBe('Found');
    });

    it('should return null when not found', async () => {
      defineElement('test-find-null', {
        template: html`<div>No target</div>`,
      });

      const el = document.createElement('test-find-null') as WebComponent;
      await attach(el, container);

      expect(el.find('.target')).toBeNull();
    });

    it('should find all matching elements', async () => {
      defineElement('test-find-all', {
        template: html`<div class="item">1</div>
          <div class="item">2</div>`,
      });

      const el = document.createElement('test-find-all') as WebComponent;
      await attach(el, container);

      const items = el.findAll('.item');
      expect(items).toHaveLength(2);
    });
  });

  describe('Event Handling', () => {
    it('should attach event listener', async () => {
      defineElement('test-event', {
        template: html`<button>Click</button>`,
      });

      const el = document.createElement('test-event') as WebComponent;
      await attach(el, container);

      let clicked = false;
      const button = el.find<HTMLButtonElement>('button')!;
      el.on(button, 'click', () => {
        clicked = true;
      });

      button.click();
      expect(clicked).toBe(true);
    });

    it('should support event delegation', async () => {
      defineElement('test-delegation', {
        state: { items: [1, 2] },
        template: (el) =>
          html`${el.state.items.map((i) => `<button class="item" data-id="${i}">Item ${i}</button>`).join('')}`,
      });

      const el = document.createElement('test-delegation') as WebComponent<HTMLElement, { items: number[] }>;
      await attach(el, container);

      let clickedId = '';
      el.on('.item', 'click', (e) => {
        clickedId = (e.currentTarget as HTMLElement).dataset.id!;
      });

      const btn = el.findAll<HTMLButtonElement>('.item')[1];
      btn.click();

      expect(clickedId).toBe('2');
    });

    it('should work with dynamic elements', async () => {
      defineElement('test-dynamic', {
        state: { items: [1] },
        template: (el) =>
          html`${el.state.items.map((i) => `<button class="item" data-id="${i}">Item ${i}</button>`).join('')}`,
      });

      const el = document.createElement('test-dynamic') as WebComponent<HTMLElement, { items: number[] }>;
      await attach(el, container);

      let clickedId = '';
      el.on('.item', 'click', (e) => {
        clickedId = (e.currentTarget as HTMLElement).dataset.id!;
      });

      el.state.items.push(2);
      await el.flush();

      const newBtn = el.findAll<HTMLButtonElement>('.item')[1];
      newBtn.click();

      expect(clickedId).toBe('2');
    });
  });

  describe('Event Emission', () => {
    it('should emit custom events', async () => {
      defineElement('test-emit', {
        template: html`<div>Component</div>`,
      });

      const el = document.createElement('test-emit') as WebComponent;
      await attach(el, container);

      let eventDetail: unknown;
      el.addEventListener('custom', ((e: CustomEvent) => {
        eventDetail = e.detail;
      }) as EventListener);

      el.emit('custom', { data: 'test' });

      expect(eventDetail).toEqual({ data: 'test' });
    });
  });

  describe('Timeouts', () => {
    it('should schedule timeout with delay()', async () => {
      defineElement('test-delay', {
        template: html`<div>Component</div>`,
      });

      const el = document.createElement('test-delay') as WebComponent;
      await attach(el, container);

      let called = false;
      el.delay(() => {
        called = true;
      }, 10);

      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(called).toBe(true);
    });

    it('should clear timeout', async () => {
      defineElement('test-clear', {
        template: html`<div>Component</div>`,
      });

      const el = document.createElement('test-clear') as WebComponent;
      await attach(el, container);

      let called = false;
      const id = el.delay(() => {
        called = true;
      }, 10);

      el.clear(id);

      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(called).toBe(false);
    });
  });

  describe('Lifecycle Hooks', () => {
    it('should call onConnected', async () => {
      let connected = false;
      defineElement('test-connected', {
        onConnected: () => {
          connected = true;
        },
        template: html`<div>Component</div>`,
      });

      const el = document.createElement('test-connected') as WebComponent;
      await attach(el, container);

      expect(connected).toBe(true);
    });

    it('should call onDisconnected', async () => {
      let disconnected = false;
      defineElement('test-disconnected', {
        onDisconnected: () => {
          disconnected = true;
        },
        template: html`<div>Component</div>`,
      });

      const el = document.createElement('test-disconnected') as WebComponent;
      await attach(el, container);

      el.remove();
      expect(disconnected).toBe(true);
    });

    it('should call onUpdated after render', async () => {
      let updateCount = 0;
      defineElement('test-updated', {
        onUpdated: () => updateCount++,
        state: { count: 0 },
        template: (el) => html`<div>${el.state.count}</div>`,
      });

      const el = document.createElement('test-updated') as WebComponent<HTMLElement, { count: number }>;
      await attach(el, container);

      const initial = updateCount;

      el.state.count = 1;
      await el.flush();

      expect(updateCount).toBe(initial + 1);
    });
  });

  describe('Observed Attributes', () => {
    it('should create property for observed attribute', async () => {
      defineElement('test-attr', {
        observedAttributes: ['data-value'] as const,
        template: html`<div>Component</div>`,
      });

      const el = document.createElement('test-attr') as WebComponent & { dataValue: string };
      await attach(el, container);

      el.dataValue = 'test';
      expect(el.getAttribute('data-value')).toBe('test');
    });

    it('should handle boolean attributes', async () => {
      defineElement('test-bool-attr', {
        observedAttributes: ['disabled'] as const,
        template: html`<div>Component</div>`,
      });

      const el = document.createElement('test-bool-attr') as WebComponent & { disabled: boolean };
      await attach(el, container);

      el.disabled = true;
      expect(el.getAttribute('disabled')).toBe('');

      el.disabled = false;
      expect(el.hasAttribute('disabled')).toBe(false);
    });
  });

  describe('Form Elements', () => {
    it('should update text input value', async () => {
      defineElement('test-input', {
        state: { value: 'initial' },
        template: (el) => html`<input type="text" value="${el.state.value}" />`,
      });

      const el = document.createElement('test-input') as WebComponent<HTMLElement, { value: string }>;
      await attach(el, container);

      const input = el.find<HTMLInputElement>('input')!;
      expect(input.value).toBe('initial');

      el.state.value = 'updated';
      await el.flush();

      expect(input.value).toBe('updated');
    });

    it('should clear input when value is empty', async () => {
      defineElement('test-input-clear', {
        state: { value: 'initial' },
        template: (el) => html`<input type="text" ${el.state.value ? `value="${el.state.value}"` : ''} />`,
      });

      const el = document.createElement('test-input-clear') as WebComponent<HTMLElement, { value: string }>;
      await attach(el, container);

      el.state.value = '';
      await el.flush();

      expect(el.find<HTMLInputElement>('input')!.value).toBe('');
    });

    it('should update checkbox checked', async () => {
      defineElement('test-checkbox', {
        state: { checked: false },
        template: (el) => html`<input type="checkbox" ${el.state.checked ? 'checked' : ''} />`,
      });

      const el = document.createElement('test-checkbox') as WebComponent<HTMLElement, { checked: boolean }>;
      await attach(el, container);

      el.state.checked = true;
      await el.flush();

      expect(el.find<HTMLInputElement>('input')!.checked).toBe(true);
    });

    it('should update textarea value', async () => {
      defineElement('test-textarea', {
        state: { text: 'Hello' },
        template: (el) => html`<textarea>${el.state.text}</textarea>`,
      });

      const el = document.createElement('test-textarea') as WebComponent<HTMLElement, { text: string }>;
      await attach(el, container);

      el.state.text = 'Updated';
      await el.flush();

      expect(el.find<HTMLTextAreaElement>('textarea')!.value).toBe('Updated');
    });

    it('should sync disabled state', async () => {
      defineElement('test-disabled', {
        state: { disabled: false },
        template: (el) => html`<input type="text" ${el.state.disabled ? 'disabled' : ''} />`,
      });

      const el = document.createElement('test-disabled') as WebComponent<HTMLElement, { disabled: boolean }>;
      await attach(el, container);

      el.state.disabled = true;
      await el.flush();

      expect(el.find<HTMLInputElement>('input')!.disabled).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle template errors', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      defineElement('test-error', {
        template: () => {
          throw new Error('Template error');
        },
      });

      const el = document.createElement('test-error') as WebComponent;
      await attach(el, container);

      const errorDiv = el.shadow.querySelector('[data-debug="render-error"]');
      expect(errorDiv).toBeTruthy();

      consoleError.mockRestore();
    });
  });

  describe('Testing Utilities', () => {
    it('should attach element', async () => {
      defineElement('test-attach', {
        template: html`<div>Attached</div>`,
      });

      const el = document.createElement('test-attach') as WebComponent;
      await attach(el, container);

      expect(container.contains(el)).toBe(true);
    });

    it('should destroy element', async () => {
      defineElement('test-destroy', {
        template: html`<div>Will be destroyed</div>`,
      });

      const el = document.createElement('test-destroy') as WebComponent;
      await attach(el, container);

      destroy(el);

      expect(container.contains(el)).toBe(false);
    });
  });

  describe('Form Association', () => {
    it('should create form-associated element', async () => {
      defineElement('test-form', {
        formAssociated: true,
        template: html`<input type="text" />`,
      });

      const el = document.createElement('test-form') as WebComponent;
      await attach(el, container);

      expect(el.internals).toBeDefined();
    });

    it('should set form value', async () => {
      defineElement('test-form-value', {
        formAssociated: true,
        template: html`<input type="text" />`,
      });

      const el = document.createElement('test-form-value') as WebComponent;
      await attach(el, container);

      if (el.internals && 'setFormValue' in el.internals) {
        el.form?.value('test');
        expect(el.value).toBe('test');
      } else {
        // Skip test in environments where ElementInternals is not fully supported
        expect(el.internals).toBeDefined();
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid state updates', async () => {
      defineElement('test-rapid', {
        state: { count: 0 },
        template: (el) => html`<div>${el.state.count}</div>`,
      });

      const el = document.createElement('test-rapid') as WebComponent<HTMLElement, { count: number }>;
      await attach(el, container);

      for (let i = 1; i <= 10; i++) {
        el.state.count = i;
      }

      await el.flush();

      expect(el.find('div')?.textContent).toBe('10');
    });

    it('should handle same-value updates', async () => {
      let renderCount = 0;
      defineElement('test-same', {
        onUpdated: () => renderCount++,
        state: { count: 0 },
        template: (el) => html`<div>${el.state.count}</div>`,
      });

      const el = document.createElement('test-same') as WebComponent<HTMLElement, { count: number }>;
      await attach(el, container);

      const initial = renderCount;

      el.state.count = 0;
      await el.flush();

      expect(renderCount).toBe(initial);
    });
  });
});
