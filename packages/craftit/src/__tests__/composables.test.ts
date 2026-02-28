/**
 * Composables - Ref, Props, Context Tests
 * Comprehensive tests for composable utilities
 */
import { afterEach, describe, expect, it } from 'vitest';
import { define, html, type InjectionKey, inject, prop, provide, ref } from '..';
import { cleanup, mount } from '../test/trial';

// Counter for unique component names
let componentCounter = 0;
const uniqueName = (base: string) => `${base}-${++componentCounter}`;

describe('Composables', () => {
  afterEach(() => cleanup());

  describe('ref()', () => {
    it('should create element reference', async () => {
      const name = uniqueName('test-ref');
      define(name, () => {
        const btnRef = ref<HTMLButtonElement>();
        return html`<button ref=${btnRef}>Click</button>`;
      });

      const { query, waitForUpdates } = mount(name);
      await waitForUpdates();
      const btn = query('button');
      expect(btn).not.toBeNull();
    });

    it('should update ref value when element mounts', async () => {
      const name = uniqueName('test-ref-value');
      define(name, () => {
        const divRef = ref<HTMLDivElement>();
        setTimeout(() => {
          expect(divRef.value).not.toBeNull();
        }, 10);
        return html`<div ref=${divRef}>Test</div>`;
      });

      mount(name);
      await new Promise((r) => setTimeout(r, 20));
    });
  });

  describe('prop()', () => {
    it('should create reactive prop', () => {
      const name = uniqueName('test-prop');
      define(name, () => {
        const nameProp = prop('name', 'Guest');
        return html`<div>Hello ${nameProp}</div>`;
      });

      const { query } = mount(name);
      expect(query('div')?.textContent).toContain('Guest');
    });

    it('should update from attribute', async () => {
      const name = uniqueName('test-prop-attr');
      define(name, () => {
        const nameProp = prop('name', 'Guest');
        return html`<div>${nameProp}</div>`;
      });

      const { query, waitForUpdates } = mount(name, {
        props: { name: 'Alice' },
      });

      await waitForUpdates();
      expect(query('div')?.textContent).toBe('Alice');
    });
  });

  describe('Context (provide/inject)', () => {
    it('should provide and inject values', async () => {
      const ThemeKey = Symbol('theme') as InjectionKey<string>;
      let injectedValue = '';

      const consumerName = uniqueName('test-consumer');
      define(consumerName, () => {
        injectedValue = inject(ThemeKey) || '';
        return html`<div>${injectedValue}</div>`;
      });

      const providerName = uniqueName('test-provider');
      define(providerName, () => {
        provide(ThemeKey, 'dark');
        return html`<${consumerName}></${consumerName}>`;
      });

      const { waitForUpdates } = mount(providerName);
      await waitForUpdates();
      expect(injectedValue).toBe('dark');
    });

    it('should use default value when not provided', () => {
      const Key = Symbol('test') as InjectionKey<string>;
      const name = uniqueName('test-inject-default');

      define(name, () => {
        const value = inject(Key, 'default');
        return html`<div>${value}</div>`;
      });

      const { query } = mount(name);
      expect(query('div')?.textContent).toBe('default');
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple refs in same component', async () => {
      const name = uniqueName('test-multiple-refs');
      define(name, () => {
        const ref1 = ref<HTMLDivElement>();
        const ref2 = ref<HTMLSpanElement>();

        return html`
          <div ref=${ref1}>Div</div>
          <span ref=${ref2}>Span</span>
        `;
      });

      const { query, waitForUpdates } = mount(name);
      await waitForUpdates();

      expect(query('div')).not.toBeNull();
      expect(query('span')).not.toBeNull();
    });

    it('should handle nested provides', async () => {
      const Key = Symbol('value') as InjectionKey<number>;
      let receivedValue: number | undefined;

      define('test-nested-consumer-4', () => {
        receivedValue = inject(Key);
        return html`<div class="result">${receivedValue}</div>`;
      });

      define('test-nested-inner-4', () => {
        provide(Key, 2);
        return html`<test-nested-consumer-4></test-nested-consumer-4>`;
      });

      define('test-nested-outer-4', () => {
        provide(Key, 1);
        return html`<test-nested-inner-4></test-nested-inner-4>`;
      });

      const { element, waitForUpdates } = mount('test-nested-outer-4');
      await waitForUpdates();

      // Navigate through nested shadow roots to find the div
      const innerEl = element.shadowRoot?.querySelector('test-nested-inner-4');
      const consumerEl = innerEl?.shadowRoot?.querySelector('test-nested-consumer-4');
      const resultDiv = consumerEl?.shadowRoot?.querySelector('div.result');

      expect(receivedValue).toBe(2);
      expect(resultDiv?.textContent).toBe('2');
    });
  });
});
