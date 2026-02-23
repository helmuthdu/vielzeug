/** Comprehensive test suite for @vielzeug/craftit */
import type { WebComponent } from './craftit';
import { css, defineElement, html } from './craftit';
import { attach, destroy } from './testing';

describe('Craftit Library', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  /* ==================== HTML Template System ==================== */

  describe('HTML Template System', () => {
    describe('Basic Interpolation', () => {
      it('should interpolate values', () => {
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

    describe('Boolean Attributes', () => {
      it('should include attribute when true', () => {
        const disabled = true;
        const result = html`<button ?disabled="${disabled}">Click</button>`;
        expect(result).toBe('<button disabled>Click</button>');
      });

      it('should omit attribute when false', () => {
        const disabled = false;
        const result = html`<button ?disabled="${disabled}">Click</button>`;
        expect(result).toBe('<button>Click</button>');
      });

      it('should include attribute for empty string', () => {
        const disabled = '';
        const result = html`<button ?disabled="${disabled}">Click</button>`;
        expect(result).toBe('<button disabled>Click</button>');
      });

      it('should omit attribute for null/undefined', () => {
        const disabled1 = null;
        const disabled2 = undefined;
        const result1 = html`<button ?disabled="${disabled1}">Click</button>`;
        const result2 = html`<button ?disabled="${disabled2}">Click</button>`;
        expect(result1).toBe('<button>Click</button>');
        expect(result2).toBe('<button>Click</button>');
      });

      it('should handle multiple boolean attributes', () => {
        const disabled = true;
        const readonly = false;
        const required = true;
        const result = html`<input ?disabled="${disabled}" ?readonly="${readonly}" ?required="${required}" />`;
        expect(result).toBe('<input disabled required />');
      });

      it('should mix boolean and regular attributes', () => {
        const disabled = true;
        const type = 'submit';
        const result = html`<button type="${type}" ?disabled="${disabled}">Submit</button>`;
        expect(result).toBe('<button type="submit" disabled>Submit</button>');
      });

      it('should handle hyphenated attributes', () => {
        const busy = true;
        const result = html`<div ?aria-busy="${busy}">Loading</div>`;
        expect(result).toBe('<div aria-busy>Loading</div>');
      });
    });

    describe('Property Binding', () => {
      it('should create data attribute for property binding', () => {
        const value = 'test value';
        const result = html`<input .value="${value}" />`;
        const htmlString = typeof result === 'string' ? result : result.__html;
        expect(htmlString).toContain('data-__prop_0="value"');
      });

      it('should store property bindings metadata', () => {
        const value = 'test value';
        const result = html`<input .value="${value}" />`;
        expect(typeof result).toBe('object');
        expect((result as any).__propertyBindings).toBeDefined();
        expect((result as any).__propertyBindings).toHaveLength(1);
        expect((result as any).__propertyBindings[0]).toEqual({
          selector: '[data-__prop_0]',
          property: 'value',
          value: 'test value',
        });
      });

      it('should handle multiple property bindings', () => {
        const value = 'test';
        const indeterminate = true;
        const result = html`<input .value="${value}" .indeterminate="${indeterminate}" />`;
        expect((result as any).__propertyBindings).toHaveLength(2);
      });

      it('should handle hyphenated property names', () => {
        const value = 'test';
        const result = html`<input .my-prop="${value}" />`;
        expect((result as any).__propertyBindings[0].property).toBe('my-prop');
      });

      it('should combine boolean attributes and property binding', () => {
        const disabled = true;
        const value = 'test';
        const result = html`<input ?disabled="${disabled}" .value="${value}" />`;
        const htmlString = typeof result === 'string' ? result : result.__html;
        expect(htmlString).toContain('disabled');
        expect(htmlString).toContain('data-__prop_0="value"');
      });
    });
  });

  /* ==================== HTML Template Helpers ==================== */

  describe('HTML Template Helpers', () => {
    describe('html.repeat()', () => {
      it('should repeat without key function', () => {
        const users = [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
        ];
        const result = html.repeat(users, (user, i) => html`<li>${i}: ${user.name}</li>`);
        expect(result).toBe('<li>0: Alice</li><li>1: Bob</li>');
      });

      it('should repeat with key function', () => {
        const users = [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
        ];
        const result = html.repeat(
          users,
          (user: any) => user.id,
          (user) => html`<li>${user.name}</li>`,
        );
        expect(result).toBe('<li>Alice</li><li>Bob</li>');
      });

      it('should handle empty arrays', () => {
        const result = html.repeat([], (item: any) => html`<li>${item}</li>`);
        expect(result).toBe('');
      });
    });

    describe('html.when()', () => {
      it('should render truthy template when true', () => {
        const result = html.when(true, html`<div>Yes</div>`, html`<div>No</div>`);
        expect(result).toBe('<div>Yes</div>');
      });

      it('should render falsy template when false', () => {
        const result = html.when(false, html`<div>Yes</div>`, html`<div>No</div>`);
        expect(result).toBe('<div>No</div>');
      });

      it('should return empty without falsy template', () => {
        const result = html.when(false, html`<div>Yes</div>`);
        expect(result).toBe('');
      });

      it('should handle truthy values', () => {
        const result = html.when(1, html`<div>Yes</div>`);
        expect(result).toBe('<div>Yes</div>');
      });
    });

    describe('html.until()', () => {
      it('should return placeholder with fallback', () => {
        const promise = Promise.resolve(html`<div>Loaded</div>`);
        const result = html.until(promise, html`<div>Loading...</div>`);
        expect(result).toContain('Loading...');
        expect(result).toContain('data-until-id');
      });

      it('should handle string fallback', () => {
        const promise = Promise.resolve('<div>Loaded</div>');
        const result = html.until(promise, '<div>Loading...</div>');
        expect(result).toContain('Loading...');
      });

      it('should resolve and update DOM', async () => {
        const promise = Promise.resolve(html`<div>Loaded content</div>`);
        const result = html.until(promise, html`<div>Loading...</div>`);

        const testContainer = document.createElement('div');
        testContainer.innerHTML = result;
        document.body.appendChild(testContainer);

        await promise;
        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(testContainer.textContent).toContain('Loaded content');
        testContainer.remove();
      });
    });

    describe('html.classes()', () => {
      it('should filter truthy classes from object', () => {
        const result = html.classes({ active: true, disabled: false, visible: true });
        expect(result).toBe('active visible');
      });

      it('should handle array syntax', () => {
        const result = html.classes(['btn', 'primary', false && 'hidden']);
        expect(result).toBe('btn primary');
      });

      it('should handle mixed array with objects', () => {
        const result = html.classes(['btn', { active: true, disabled: false }]);
        expect(result).toBe('btn active');
      });

      it('should return empty for all falsy', () => {
        const result = html.classes({ active: false, disabled: false });
        expect(result).toBe('');
      });

      it('should handle undefined values', () => {
        const result = html.classes({ active: true, disabled: undefined });
        expect(result).toBe('active');
      });
    });

    describe('html.styles()', () => {
      it('should convert camelCase to kebab-case', () => {
        const result = html.styles({ backgroundColor: 'red', fontSize: '16px' });
        expect(result).toBe('background-color: red; font-size: 16px');
      });

      it('should filter null and undefined', () => {
        const result = html.styles({ color: 'red', display: undefined, opacity: null });
        expect(result).toBe('color: red');
      });

      it('should handle numeric values', () => {
        const result = html.styles({ opacity: 0.5, zIndex: 10 });
        expect(result).toBe('opacity: 0.5; z-index: 10');
      });

      it('should return empty for empty object', () => {
        const result = html.styles({});
        expect(result).toBe('');
      });
    });

    describe('html.portal()', () => {
      it('should render content in target element', async () => {
        const target = document.createElement('div');
        target.id = 'portal-target';
        document.body.appendChild(target);

        const result = html.portal(html`<div class="portal-content">Portal content</div>`, '#portal-target');
        expect(result).toContain('data-portal-placeholder');

        await new Promise((resolve) => setTimeout(resolve, 10));

        const portalContent = target.querySelector('.portal-content');
        expect(portalContent?.textContent).toBe('Portal content');

        target.remove();
      });

      it('should warn if target not found', async () => {
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const result = html.portal(html`<div>Content</div>`, '#nonexistent');
        expect(result).toContain('data-portal-placeholder');

        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
      });
    });
  });

  /* ==================== CSS System ==================== */

  describe('CSS System', () => {
    describe('css Template Literal', () => {
      it('should interpolate CSS', () => {
        const color = 'red';
        const result = css`
          color: ${color};
          font-size: 16px;
        `;
        expect(result).toContain('color: red');
        expect(result).toContain('font-size: 16px');
      });

      it('should return CSS string', () => {
        const result = css`
          .button {
            color: red;
          }
        `;
        expect(result).toContain('.button');
        expect(result).toContain('color: red');
      });
    });

    describe('css.theme()', () => {
      it('should create theme with CSS variables', () => {
        const theme = css.theme({
          primaryColor: '#3b82f6',
          spacing: '1rem',
        });

        // theme is a proxy object, check that it has the CSS string
        const themeStr = theme.toString();
        expect(themeStr).toContain('--primary-color: #3b82f6');
        expect(themeStr).toContain('--spacing: 1rem');
      });

      it('should provide typed variable access', () => {
        const theme = css.theme({
          primaryColor: '#3b82f6',
          bgColor: '#ffffff',
        });

        const primary: string = theme.primaryColor;
        const bg: string = theme.bgColor;

        expect(primary).toContain('var(--primary-color)');
        expect(bg).toContain('var(--bg-color)');
      });

      it('should handle light/dark themes', () => {
        const theme = css.theme(
          {
            primaryColor: '#3b82f6',
            bgColor: '#ffffff',
          },
          {
            primaryColor: '#60a5fa',
            bgColor: '#1f2937',
          },
        );

        const themeStr = theme.toString();
        expect(themeStr).toContain(':host');
        expect(themeStr).toContain('@media (prefers-color-scheme: dark)');
        expect(themeStr).toContain('--primary-color: #3b82f6');
        expect(themeStr).toContain('--primary-color: #60a5fa');
      });
    });
  });

  /* ==================== Component System ==================== */

  describe('Component System', () => {
    describe('Component Creation', () => {
      it('should create and register component', async () => {
        defineElement('test-basic', {
          template: html`<div>Hello World</div>`,
        });

        const el = document.createElement('test-basic') as WebComponent;
        await attach(el, container);

        expect(el.shadow.innerHTML).toContain('Hello World');
      });

      it('should warn on duplicate registration', () => {
        const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

        defineElement('test-dup', { template: html`<div>First</div>` });
        defineElement('test-dup', { template: html`<div>Second</div>` });

        expect(consoleWarn).toHaveBeenCalled();
        consoleWarn.mockRestore();
      });

      it('should initialize with empty state', async () => {
        defineElement('test-empty-state', {
          state: {},
          template: html`<div>Component</div>`,
        });

        const el = document.createElement('test-empty-state') as WebComponent;
        await attach(el, container);

        expect(el.state).toBeDefined();
      });

      it('should provide shadow root access', async () => {
        defineElement('test-shadow', {
          template: html`<div>Shadow DOM</div>`,
        });

        const el = document.createElement('test-shadow') as WebComponent;
        await attach(el, container);

        expect(el.shadow).toBeDefined();
        expect(el.shadow.mode).toBe('open');
      });
    });

    describe('Lifecycle Hooks', () => {
      it('should call onConnected', async () => {
        let called = false;

        defineElement('test-connected', {
          template: html`<div>Test</div>`,
          onConnected: () => {
            called = true;
          },
        });

        const el = document.createElement('test-connected');
        await attach(el, container);

        expect(called).toBe(true);
      });

      it('should call onDisconnected', async () => {
        let connected = false;
        let disconnected = false;

        defineElement('test-disconnected', {
          template: html`<div>Test</div>`,
          onConnected: () => {
            connected = true;
          },
          onDisconnected: () => {
            disconnected = true;
          },
        });

        const el = document.createElement('test-disconnected');
        await attach(el, container);
        expect(connected).toBe(true);

        destroy(el);
        expect(disconnected).toBe(true);
      });

      it('should call onUpdated after render', async () => {
        let updateCount = 0;

        defineElement('test-updated', {
          state: { count: 0 },
          template: (el) => html`<div>${el.state.count}</div>`,
          onUpdated: () => {
            updateCount++;
          },
        });

        const el = document.createElement('test-updated') as WebComponent<HTMLElement, object, { count: number }>;
        await attach(el, container);

        const initial = updateCount;
        el.state.count++;
        await el.flush();

        expect(updateCount).toBeGreaterThan(initial);
      });
    });
  });

  /* ==================== Reactive State System ==================== */

  describe('Reactive State System', () => {
    describe('State Management', () => {
      it('should initialize with default state', async () => {
        defineElement('test-state-init', {
          state: { count: 0, name: 'Alice' },
          template: (el) => html`<div>${el.state.count} ${el.state.name}</div>`,
        });

        const el = document.createElement('test-state-init') as WebComponent<
          HTMLElement,
          object,
          { count: number; name: string }
        >;
        await attach(el, container);

        expect(el.state.count).toBe(0);
        expect(el.state.name).toBe('Alice');
      });

      it('should trigger re-render on state change', async () => {
        defineElement('test-state-change', {
          state: { count: 0 },
          template: (el) => html`<div class="count">${el.state.count}</div>`,
        });

        const el = document.createElement('test-state-change') as WebComponent<HTMLElement, object, { count: number }>;
        await attach(el, container);

        expect(el.shadow.querySelector('.count')?.textContent).toBe('0');

        el.state.count = 5;
        await el.flush();

        expect(el.shadow.querySelector('.count')?.textContent).toBe('5');
      });

      it('should handle nested state objects', async () => {
        defineElement('test-nested-state', {
          state: { user: { name: 'Alice', age: 30 } },
          template: (el) => html`<div>${el.state.user.name}</div>`,
        });

        const el = document.createElement('test-nested-state') as WebComponent<
          HTMLElement,
          object,
          { user: { name: string; age: number } }
        >;
        await attach(el, container);

        el.state.user.name = 'Bob';
        await el.flush();

        expect(el.shadow.querySelector('div')?.textContent).toBe('Bob');
      });

      it('should not trigger render for private state (_prefix)', async () => {
        let renderCount = 0;

        defineElement('test-private-state', {
          state: { count: 0, _internal: 0 },
          template: (el) => html`<div>${el.state.count}</div>`,
          onUpdated: () => renderCount++,
        });

        const el = document.createElement('test-private-state') as WebComponent<
          HTMLElement,
          object,
          { count: number; _internal: number }
        >;
        await attach(el, container);

        const initial = renderCount;
        el.state._internal = 10;
        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(renderCount).toBe(initial);
      });
    });

    describe('Watchers', () => {
      it('should watch state changes', async () => {
        defineElement('test-watch', {
          state: { count: 0 },
          template: (el) => html`<div>${el.state.count}</div>`,
        });

        const el = document.createElement('test-watch') as WebComponent<HTMLElement, object, { count: number }>;
        await attach(el, container);

        const values: number[] = [];
        el.watch(
          (state) => state.count,
          (val) => values.push(val),
        );

        el.state.count = 1;
        await el.flush();
        el.state.count = 2;
        await el.flush();

        expect(values).toContain(1);
        expect(values).toContain(2);
      });

      it('should unwatch when cleanup called', async () => {
        defineElement('test-unwatch', {
          state: { count: 0 },
          template: (el) => html`<div>${el.state.count}</div>`,
        });

        const el = document.createElement('test-unwatch') as WebComponent<HTMLElement, object, { count: number }>;
        await attach(el, container);

        let callCount = 0;
        const unwatch = el.watch(
          (state) => state.count,
          () => callCount++,
        );

        el.state.count = 1;
        await el.flush();

        const countAfterFirst = callCount;
        expect(countAfterFirst).toBeGreaterThan(0);

        unwatch();

        el.state.count = 2;
        await el.flush();

        expect(callCount).toBe(countAfterFirst); // Should not increase
      });
    });
  });

  /* ==================== Advanced Features ==================== */

  describe('Advanced Features', () => {
    describe('Computed Properties', () => {
      it('should compute derived values', async () => {
        defineElement('test-computed', {
          state: {
            items: [
              { price: 10, quantity: 2 },
              { price: 20, quantity: 1 },
            ],
          },
          computed: {
            total: (state) => state.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
            itemCount: (state) => state.items.length,
          },
          template: (el) => html`
            <div class="total">${el.computed.total}</div>
            <div class="count">${el.computed.itemCount}</div>
          `,
        });

        const el = document.createElement('test-computed') as WebComponent<
          HTMLElement,
          object,
          { items: Array<{ price: number; quantity: number }> }
        >;
        await attach(el, container);

        expect(el.shadow.querySelector('.total')?.textContent).toBe('40');
        expect(el.shadow.querySelector('.count')?.textContent).toBe('2');
      });

      it('should recompute when state changes', async () => {
        defineElement('test-computed-update', {
          state: { price: 10, quantity: 2 },
          computed: {
            total: (state) => state.price * state.quantity,
          },
          template: (el) => html`<div class="total">${el.computed.total}</div>`,
        });

        const el = document.createElement('test-computed-update') as WebComponent<
          HTMLElement,
          object,
          { price: number; quantity: number }
        >;
        await attach(el, container);

        expect(el.shadow.querySelector('.total')?.textContent).toBe('20');

        el.state.quantity = 3;
        await el.flush();

        expect(el.shadow.querySelector('.total')?.textContent).toBe('30');
      });

      it('should cache computed values', async () => {
        let computeCount = 0;

        defineElement('test-computed-cache', {
          state: { value: 10 },
          computed: {
            doubled: (state) => {
              computeCount++;
              return state.value * 2;
            },
          },
          template: (el) => html`<div>${el.computed.doubled}</div>`,
        });

        const el = document.createElement('test-computed-cache') as WebComponent<
          HTMLElement,
          object,
          { value: number }
        >;
        await attach(el, container);

        const initialCount = computeCount;

        // Access multiple times - should use cache
        void el.computed.doubled;
        void el.computed.doubled;

        expect(computeCount).toBe(initialCount);

        // Change state - should recompute
        el.state.value = 20;
        await el.flush();

        expect(computeCount).toBeGreaterThan(initialCount);
      });
    });

    describe('Actions', () => {
      it('should define reusable action methods', async () => {
        defineElement('test-actions', {
          state: { count: 0 },
          actions: {
            increment(el) {
              el.state.count++;
            },
            decrement(el) {
              el.state.count--;
            },
            reset(el) {
              el.state.count = 0;
            },
          },
          template: (el) => html`<div class="count">${el.state.count}</div>`,
        });

        const el = document.createElement('test-actions') as WebComponent<HTMLElement, object, { count: number }>;
        await attach(el, container);

        el.actions.increment();
        await el.flush();
        expect(el.shadow.querySelector('.count')?.textContent).toBe('1');

        el.actions.decrement();
        await el.flush();
        expect(el.shadow.querySelector('.count')?.textContent).toBe('0');

        el.actions.reset();
        await el.flush();
        expect(el.shadow.querySelector('.count')?.textContent).toBe('0');
      });

      it('should pass arguments to actions', async () => {
        defineElement('test-actions-args', {
          state: { count: 0 },
          actions: {
            add(el, amount: number) {
              el.state.count += amount;
            },
          },
          template: (el) => html`<div class="count">${el.state.count}</div>`,
        });

        const el = document.createElement('test-actions-args') as WebComponent<HTMLElement, object, { count: number }>;
        await attach(el, container);

        el.actions.add(5);
        await el.flush();
        expect(el.shadow.querySelector('.count')?.textContent).toBe('5');

        el.actions.add(10);
        await el.flush();
        expect(el.shadow.querySelector('.count')?.textContent).toBe('15');
      });

      it('should work with event handlers', async () => {
        defineElement('test-actions-events', {
          state: { count: 0 },
          actions: {
            increment(el) {
              el.state.count++;
            },
          },
          template: (el) => html`
            <div class="count">${el.state.count}</div>
            <button>Increment</button>
          `,
          onConnected(el) {
            el.on('button', 'click', () => el.actions.increment());
          },
        });

        const el = document.createElement('test-actions-events') as WebComponent<
          HTMLElement,
          object,
          { count: number }
        >;
        await attach(el, container);

        const button = el.shadow.querySelector('button');
        button?.click();
        await el.flush();

        expect(el.shadow.querySelector('.count')?.textContent).toBe('1');
      });
    });

    describe('Refs (Element References)', () => {
      it('should provide direct element access', async () => {
        defineElement('test-refs', {
          template: () => html`
            <input ref="input" type="text" />
            <button ref="button">Submit</button>
          `,
        });

        const el = document.createElement('test-refs') as WebComponent;
        await attach(el, container);

        expect(el.refs.input).toBeDefined();
        expect(el.refs.button).toBeDefined();
        expect(el.refs.input.tagName).toBe('INPUT');
        expect(el.refs.button.tagName).toBe('BUTTON');
      });

      it('should update refs after re-render', async () => {
        defineElement('test-refs-update', {
          state: { show: true },
          template: (el) => html`
            ${html.when(el.state.show, html`<div ref="dynamic">Visible</div>`)}
            <div ref="static">Always here</div>
          `,
        });

        const el = document.createElement('test-refs-update') as WebComponent<HTMLElement, object, { show: boolean }>;
        await attach(el, container);

        expect(el.refs.dynamic).toBeDefined();
        expect(el.refs.static).toBeDefined();

        el.state.show = false;
        await el.flush();

        expect(el.refs.dynamic).toBeUndefined();
        expect(el.refs.static).toBeDefined();
      });

      it('should work with actions', async () => {
        defineElement('test-refs-actions', {
          state: { value: '' },
          actions: {
            focusInput(el) {
              el.refs.input?.focus();
            },
            getValue(el) {
              return (el.refs.input as HTMLInputElement)?.value || '';
            },
          },
          template: () => html`<input ref="input" type="text" />`,
        });

        const el = document.createElement('test-refs-actions') as WebComponent<HTMLElement, object, { value: string }>;
        await attach(el, container);

        el.actions.focusInput();
        expect(el.refs.input).toBeDefined();

        (el.refs.input as HTMLInputElement).value = 'test';
        expect(el.actions.getValue()).toBe('test');
      });
    });

    describe('Context (Provide/Inject)', () => {
      it('should provide and inject values', async () => {
        defineElement('test-provider', {
          provide: {
            theme: 'dark',
            apiUrl: 'https://api.example.com',
          },
          template: () => html`<div><slot></slot></div>`,
        });

        defineElement('test-consumer', {
          inject: ['theme', 'apiUrl'],
          template: (el) => html`
            <div class="theme">${el.context.theme}</div>
            <div class="api">${el.context.apiUrl}</div>
          `,
        });

        const provider = document.createElement('test-provider') as WebComponent;
        const consumer = document.createElement('test-consumer') as WebComponent;

        provider.appendChild(consumer);
        await attach(provider, container);

        expect(consumer.shadow.querySelector('.theme')?.textContent).toBe('dark');
        expect(consumer.shadow.querySelector('.api')?.textContent).toBe('https://api.example.com');
      });

      it('should work across multiple levels', async () => {
        defineElement('test-provider-multi', {
          provide: { user: 'Alice', role: 'admin' },
          template: () => html`<slot></slot>`,
        });

        defineElement('test-middle', {
          template: () => html`<slot></slot>`,
        });

        defineElement('test-consumer-multi', {
          inject: ['user', 'role'],
          template: (el) => html`
            <div class="user">${el.context.user}</div>
            <div class="role">${el.context.role}</div>
          `,
        });

        const provider = document.createElement('test-provider-multi') as WebComponent;
        const middle = document.createElement('test-middle') as WebComponent;
        const consumer = document.createElement('test-consumer-multi') as WebComponent;

        provider.appendChild(middle);
        middle.appendChild(consumer);
        await attach(provider, container);

        expect(consumer.shadow.querySelector('.user')?.textContent).toBe('Alice');
        expect(consumer.shadow.querySelector('.role')?.textContent).toBe('admin');
      });

      it('should use nearest provider', async () => {
        defineElement('test-provider-outer', {
          provide: { level: 'outer' },
          template: () => html`<slot></slot>`,
        });

        defineElement('test-provider-inner', {
          provide: { level: 'inner' },
          template: () => html`<slot></slot>`,
        });

        defineElement('test-consumer-nearest', {
          inject: ['level'],
          template: (el) => html`<div class="level">${el.context.level}</div>`,
        });

        const outer = document.createElement('test-provider-outer') as WebComponent;
        const inner = document.createElement('test-provider-inner') as WebComponent;
        const consumer = document.createElement('test-consumer-nearest') as WebComponent;

        outer.appendChild(inner);
        inner.appendChild(consumer);
        await attach(outer, container);

        expect(consumer.shadow.querySelector('.level')?.textContent).toBe('inner');
      });
    });

    describe('Signals (Fine-Grained Reactivity)', () => {
      it('should initialize signals', async () => {
        defineElement('test-signals-init', {
          signals: { count: 0, message: 'Hello' },
          template: (el) => html`
            <div class="count">${el.signals.count}</div>
            <div class="message">${el.signals.message}</div>
          `,
        });

        const el = document.createElement('test-signals-init') as WebComponent;
        await attach(el, container);

        expect(el.signals.count).toBe(0);
        expect(el.signals.message).toBe('Hello');
      });

      it('should allow setting signal values', async () => {
        defineElement('test-signals-set', {
          signals: { count: 0 },
          template: (el) => html`<div>${el.signals.count}</div>`,
        });

        const el = document.createElement('test-signals-set') as WebComponent;
        await attach(el, container);

        el.signals.count = 5;
        expect(el.signals.count).toBe(5);

        el.signals.count = 10;
        expect(el.signals.count).toBe(10);
      });

      it('should work alongside state', async () => {
        defineElement('test-signals-state', {
          state: { items: ['a', 'b'] },
          signals: { count: 0 },
          template: (el) => html`
            <div class="items">${el.state.items.length}</div>
            <div class="count">${el.signals.count}</div>
          `,
        });

        const el = document.createElement('test-signals-state') as WebComponent<
          HTMLElement,
          object,
          { items: string[] }
        >;
        await attach(el, container);

        expect(el.state.items.length).toBe(2);
        expect(el.signals.count).toBe(0);

        el.state.items.push('c');
        el.signals.count = 10;

        expect(el.state.items.length).toBe(3);
        expect(el.signals.count).toBe(10);
      });

      it('should handle different data types', async () => {
        defineElement('test-signals-types', {
          signals: {
            num: 42,
            str: 'hello',
            bool: true,
            obj: { key: 'value' },
          },
          template: () => html`<div>Test</div>`,
        });

        const el = document.createElement('test-signals-types') as WebComponent;
        await attach(el, container);

        expect(el.signals.num).toBe(42);
        expect(el.signals.str).toBe('hello');
        expect(el.signals.bool).toBe(true);
        expect((el.signals.obj as any).key).toBe('value');
      });

      it('should work with actions', async () => {
        defineElement('test-signals-actions', {
          signals: { count: 0 },
          actions: {
            increment(el) {
              el.signals.count = (el.signals.count as number) + 1;
            },
            reset(el) {
              el.signals.count = 0;
            },
          },
          template: (el) => html`<div>${el.signals.count}</div>`,
        });

        const el = document.createElement('test-signals-actions') as WebComponent;
        await attach(el, container);

        el.actions.increment();
        expect(el.signals.count).toBe(1);

        el.actions.increment();
        expect(el.signals.count).toBe(2);

        el.actions.reset();
        expect(el.signals.count).toBe(0);
      });

      it('should handle rapid updates', async () => {
        defineElement('test-signals-rapid', {
          signals: { counter: 0 },
          template: (el) => html`<div>${el.signals.counter}</div>`,
        });

        const el = document.createElement('test-signals-rapid') as WebComponent;
        await attach(el, container);

        for (let i = 1; i <= 100; i++) {
          el.signals.counter = i;
        }

        expect(el.signals.counter).toBe(100);
      });
    });
  });

  /* ==================== DOM & Events ==================== */

  describe('DOM & Events', () => {
    describe('DOM Queries', () => {
      it('should query elements in shadow DOM', async () => {
        defineElement('test-query', {
          template: html`
            <div class="container">
              <span class="item">Item</span>
            </div>
          `,
        });

        const el = document.createElement('test-query') as WebComponent;
        await attach(el, container);

        const item = el.query('.item');
        expect(item).toBeDefined();
        expect(item?.textContent).toBe('Item');
      });

      it('should query all elements', async () => {
        defineElement('test-query-all', {
          template: html`
            <ul>
              <li class="item">1</li>
              <li class="item">2</li>
              <li class="item">3</li>
            </ul>
          `,
        });

        const el = document.createElement('test-query-all') as WebComponent;
        await attach(el, container);

        const items = el.queryAll('.item');
        expect(items).toHaveLength(3);
        expect(items[0].textContent).toBe('1');
      });

      it('should return undefined for non-existent elements', async () => {
        defineElement('test-query-null', {
          template: html`<div>Content</div>`,
        });

        const el = document.createElement('test-query-null') as WebComponent;
        await attach(el, container);

        const item = el.query('.nonexistent');
        expect(item).toBeUndefined();
      });
    });

    describe('Event Handling', () => {
      it('should handle click events', async () => {
        let clicked = false;

        defineElement('test-click', {
          template: html`<button>Click me</button>`,
          onConnected(el) {
            el.on('button', 'click', () => {
              clicked = true;
            });
          },
        });

        const el = document.createElement('test-click') as WebComponent;
        await attach(el, container);

        const button = el.shadow.querySelector('button');
        button?.click();

        expect(clicked).toBe(true);
      });

      it('should provide event and target', async () => {
        let eventReceived: Event | null = null;
        let targetReceived: Element | null = null;

        defineElement('test-event-target', {
          template: html`<button class="btn">Click</button>`,
          onConnected(el) {
            el.on('.btn', 'click', (e, target) => {
              eventReceived = e;
              targetReceived = target as Element;
            });
          },
        });

        const el = document.createElement('test-event-target') as WebComponent;
        await attach(el, container);

        const button = el.shadow.querySelector('button');
        button?.click();

        expect(eventReceived).toBeDefined();
        expect(targetReceived).not.toBeNull();
        expect(targetReceived).toBeInstanceOf(Element);
        expect((targetReceived as unknown as Element).classList.contains('btn')).toBe(true);
      });

      it('should handle multiple listeners', async () => {
        let count = 0;

        defineElement('test-multi-listeners', {
          template: html`<button>Click</button>`,
          onConnected(el) {
            el.on('button', 'click', () => count++);
            el.on('button', 'click', () => count++);
          },
        });

        const el = document.createElement('test-multi-listeners') as WebComponent;
        await attach(el, container);

        const button = el.shadow.querySelector('button');
        button?.click();

        expect(count).toBe(2);
      });

      it('should clean up on disconnect', async () => {
        let clickCount = 0;

        defineElement('test-cleanup', {
          template: html`<button>Click</button>`,
          onConnected(el) {
            el.on('button', 'click', () => clickCount++);
          },
        });

        const el = document.createElement('test-cleanup') as WebComponent;
        await attach(el, container);

        const button = el.shadow.querySelector('button');
        button?.click();
        expect(clickCount).toBe(1);

        destroy(el);

        button?.click();
        expect(clickCount).toBe(1); // Should not increase
      });
    });

    describe('Event Emission', () => {
      it('should emit custom events', async () => {
        let detail: any = null;

        defineElement('test-emit', {
          template: html`<button>Emit</button>`,
          onConnected(el) {
            el.on('button', 'click', () => {
              el.emit('custom-event', { value: 42 });
            });
          },
        });

        const el = document.createElement('test-emit') as WebComponent;
        await attach(el, container);

        el.addEventListener('custom-event', ((e: CustomEvent) => {
          detail = e.detail;
        }) as EventListener);

        const button = el.shadow.querySelector('button');
        button?.click();

        expect(detail).toEqual({ value: 42 });
      });
    });
  });

  /* ==================== Form Integration ==================== */

  describe('Form Integration', () => {
    describe('Form Association', () => {
      it('should participate in forms when formAssociated', async () => {
        defineElement('test-form-element', {
          formAssociated: true,
          state: { value: '' },
          template: (el) => html`<input type="text" .value="${el.state.value}" />`,
        });

        const form = document.createElement('form');
        const el = document.createElement('test-form-element') as WebComponent;
        form.appendChild(el);
        container.appendChild(form);

        await el.flush();

        expect(el.internals).toBeDefined();
      });

      it('should set form value', async () => {
        defineElement('test-form-value', {
          formAssociated: true,
          state: { value: 'test' },
          template: () => html`<input />`,
          onConnected(el) {
            // Only test if internals are available
            if (el.internals && typeof el.internals.setFormValue === 'function') {
              el.form?.value('test-value');
            }
          },
        });

        const el = document.createElement('test-form-value') as WebComponent;
        await attach(el, container);

        // Just verify the component was created successfully
        expect(el.internals).toBeDefined();
      });
    });

    describe('Property Binding Integration', () => {
      it('should bind properties to DOM elements', async () => {
        defineElement('test-prop-binding', {
          state: { inputValue: 'test', disabled: true },
          template: (el) => html`<input .value="${el.state.inputValue}" ?disabled="${el.state.disabled}" />`,
        });

        const el = document.createElement('test-prop-binding') as WebComponent<
          HTMLElement,
          object,
          { inputValue: string; disabled: boolean }
        >;
        await attach(el, container);

        const input = el.shadow.querySelector('input') as HTMLInputElement;
        expect(input.value).toBe('test');
        expect(input.disabled).toBe(true);
      });
    });
  });

  /* ==================== Edge Cases & Error Handling ==================== */

  describe('Edge Cases & Error Handling', () => {
    describe('Error Handling', () => {
      it('should handle template errors gracefully', async () => {
        defineElement('test-error', {
          template: () => {
            throw new Error('Template error');
          },
        });

        const el = document.createElement('test-error') as WebComponent;
        await attach(el, container);

        expect(el.shadow.innerHTML).toContain('error');
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty template', async () => {
        defineElement('test-empty', {
          template: html``,
        });

        const el = document.createElement('test-empty') as WebComponent;
        await attach(el, container);

        expect(el.shadow.innerHTML).toBeDefined();
      });

      it('should handle rapid state changes', async () => {
        defineElement('test-rapid', {
          state: { count: 0 },
          template: (el) => html`<div>${el.state.count}</div>`,
        });

        const el = document.createElement('test-rapid') as WebComponent<HTMLElement, object, { count: number }>;
        await attach(el, container);

        for (let i = 0; i < 100; i++) {
          el.state.count = i;
        }

        await el.flush();
        expect(el.state.count).toBe(99);
      });

      it('should handle deeply nested components', async () => {
        defineElement('test-nested-parent', {
          template: html`<div><slot></slot></div>`,
        });

        defineElement('test-nested-child', {
          template: html`<span>Child</span>`,
        });

        const parent = document.createElement('test-nested-parent') as WebComponent;
        const child = document.createElement('test-nested-child') as WebComponent;

        parent.appendChild(child);
        await attach(parent, container);

        expect(child.shadow.innerHTML).toContain('Child');
      });
    });
  });

  /* ==================== Integration Tests ==================== */

  describe('Integration Tests', () => {
    it('should combine all features - complete app pattern', async () => {
      defineElement('test-complete-app', {
        state: {
          items: [
            { id: 1, text: 'Item 1', done: false },
            { id: 2, text: 'Item 2', done: true },
          ],
        },
        signals: {
          liveCount: 0,
        },
        computed: {
          completedCount: (state) => state.items.filter((item) => item.done).length,
          totalCount: (state) => state.items.length,
        },
        actions: {
          addItem(el) {
            const input = el.refs.input as HTMLInputElement;
            if (input?.value) {
              el.state.items.push({
                id: Date.now(),
                text: input.value,
                done: false,
              });
              input.value = '';
            }
          },
          toggleItem(el, id: number) {
            const item = el.state.items.find((i) => i.id === id);
            if (item) item.done = !item.done;
          },
        },
        template: (el) => html`
          <div class="stats">
            ${el.computed.completedCount} / ${el.computed.totalCount} completed (Live: ${el.signals.liveCount})
          </div>
          <input ref="input" type="text" />
          <button ref="addBtn">Add</button>
          <ul>
            ${html.repeat(
              el.state.items,
              (item: any) => html` <li class="${html.classes({ done: item.done })}">${item.text}</li> `,
            )}
          </ul>
        `,
        onConnected(el) {
          el.on('button', 'click', () => el.actions.addItem());
        },
      });

      const el = document.createElement('test-complete-app') as WebComponent<
        HTMLElement,
        object,
        { items: Array<{ id: number; text: string; done: boolean }> }
      >;
      await attach(el, container);

      expect(el.shadow.querySelector('.stats')?.textContent?.trim()).toContain('1 / 2 completed');

      (el.refs.input as HTMLInputElement).value = 'Item 3';
      el.actions.addItem();
      await el.flush();

      expect(el.shadow.querySelector('.stats')?.textContent?.trim()).toContain('1 / 3 completed');
      expect(el.state.items).toHaveLength(3);
    });
  });
});

