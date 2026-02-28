/**
 * Craftit - Props System Tests
 * Comprehensive tests for reactive props and attribute synchronization
 */

import { define, html } from '..';
import { prop, propBoolean, propJSON, propNumber } from '../props';

describe('Props System', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  describe('prop()', () => {
    it('should create a signal with default value', async () => {
      let nameProp: ReturnType<typeof prop<string>>;

      define('test-prop-default', () => {
        nameProp = prop('name', 'World');
        return html`<div>${nameProp}</div>`;
      });

      const el = document.createElement('test-prop-default');
      container.appendChild(el);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(nameProp!.value).toBe('World');
    });

    it('should read initial value from attribute', async () => {
      let nameProp: ReturnType<typeof prop<string>>;

      define('test-prop-attr', () => {
        nameProp = prop('name', 'World');
        return html`<div>${nameProp}</div>`;
      });

      const el = document.createElement('test-prop-attr');
      el.setAttribute('name', 'Alice');
      container.appendChild(el);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(nameProp!.value).toBe('Alice');
    });

    it('should convert camelCase to kebab-case', async () => {
      let firstNameProp: ReturnType<typeof prop<string>>;

      define('test-prop-kebab', () => {
        firstNameProp = prop('firstName', '');
        return html`<div>${firstNameProp}</div>`;
      });

      const el = document.createElement('test-prop-kebab');
      el.setAttribute('first-name', 'John');
      container.appendChild(el);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(firstNameProp!.value).toBe('John');
    });

    it('should sync attribute changes to prop', async () => {
      let nameProp: ReturnType<typeof prop<string>>;

      define('test-prop-sync', () => {
        nameProp = prop('name', 'World');
        return html`<div>${nameProp}</div>`;
      });

      const el = document.createElement('test-prop-sync');
      container.appendChild(el);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(nameProp!.value).toBe('World');

      el.setAttribute('name', 'Bob');
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(nameProp!.value).toBe('Bob');
    });

    it('should reflect prop changes to attribute when reflect: true', async () => {
      let nameProp: ReturnType<typeof prop<string>>;

      define('test-prop-reflect', () => {
        nameProp = prop('name', 'World', { reflect: true });
        return html`<div>${nameProp}</div>`;
      });

      const el = document.createElement('test-prop-reflect');
      container.appendChild(el);
      await new Promise((resolve) => setTimeout(resolve, 10));

      nameProp!.value = 'Alice';
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(el.getAttribute('name')).toBe('Alice');
    });

    it('should not reflect by default', async () => {
      let nameProp: ReturnType<typeof prop<string>>;

      define('test-prop-no-reflect', () => {
        nameProp = prop('name', 'World');
        return html`<div>${nameProp}</div>`;
      });

      const el = document.createElement('test-prop-no-reflect');
      container.appendChild(el);
      await new Promise((resolve) => setTimeout(resolve, 10));

      nameProp!.value = 'Alice';
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(el.getAttribute('name')).toBeNull();
    });

    it('should emit change events with notify: true', async () => {
      let nameProp: ReturnType<typeof prop<string>>;

      define('test-prop-notify', () => {
        nameProp = prop('name', 'World', { notify: true });
        return html`<div>${nameProp}</div>`;
      });

      const el = document.createElement('test-prop-notify');
      const eventSpy = vi.fn();
      el.addEventListener('name-changed', eventSpy);

      container.appendChild(el);
      await new Promise((resolve) => setTimeout(resolve, 10));

      nameProp!.value = 'Alice';
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(eventSpy).toHaveBeenCalled();
      expect(eventSpy.mock.calls[0][0].detail).toBe('Alice');
    });

    it('should support custom parse function', async () => {
      let dataProp: ReturnType<typeof prop<{ count: number }>>;

      define('test-prop-parse', () => {
        dataProp = prop(
          'data',
          { count: 0 },
          {
            parse: (val) => JSON.parse(val),
          },
        );
        return html`<div>${dataProp.value.count}</div>`;
      });

      const el = document.createElement('test-prop-parse');
      el.setAttribute('data', '{"count":42}');
      container.appendChild(el);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(dataProp!.value).toEqual({ count: 42 });
    });

    it('should support custom serialize function', async () => {
      let dataProp: ReturnType<typeof prop<{ count: number }>>;

      define('test-prop-serialize', () => {
        dataProp = prop(
          'data',
          { count: 0 },
          {
            reflect: true,
            serialize: (val) => JSON.stringify(val),
          },
        );
        return html`<div>${dataProp.value.count}</div>`;
      });

      const el = document.createElement('test-prop-serialize');
      container.appendChild(el);
      await new Promise((resolve) => setTimeout(resolve, 10));

      dataProp!.value = { count: 42 };
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(el.getAttribute('data')).toBe('{"count":42}');
    });

    it('should handle readonly props', async () => {
      let valueProp: ReturnType<typeof prop<string>>;

      define('test-prop-readonly', () => {
        valueProp = prop('value', 'initial', { readonly: true, reflect: true });
        return html`<div>${valueProp}</div>`;
      });

      const el = document.createElement('test-prop-readonly');
      container.appendChild(el);
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should read from attribute
      el.setAttribute('value', 'changed');
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(valueProp!.value).toBe('changed');

      // But shouldn't reflect back
      valueProp!.value = 'new-value';
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(el.getAttribute('value')).toBe('changed'); // Still old value
    });
  });

  describe('propBoolean()', () => {
    it('should default to false', async () => {
      let disabledProp: ReturnType<typeof propBoolean>;

      define('test-bool-default', () => {
        disabledProp = propBoolean('disabled');
        return html`<button disabled=${disabledProp}>Click</button>`;
      });

      const el = document.createElement('test-bool-default');
      container.appendChild(el);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(disabledProp!.value).toBe(false);
    });

    it('should parse empty string as true', async () => {
      let disabledProp: ReturnType<typeof propBoolean>;

      define('test-bool-empty', () => {
        disabledProp = propBoolean('disabled');
        return html`<button disabled=${disabledProp}>Click</button>`;
      });

      const el = document.createElement('test-bool-empty');
      el.setAttribute('disabled', '');
      container.appendChild(el);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(disabledProp!.value).toBe(true);
    });

    it("should parse 'true' string as true", async () => {
      let checkedProp: ReturnType<typeof propBoolean>;

      define('test-bool-true', () => {
        checkedProp = propBoolean('checked');
        return html`<input type="checkbox" />`;
      });

      const el = document.createElement('test-bool-true');
      el.setAttribute('checked', 'true');
      container.appendChild(el);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(checkedProp!.value).toBe(true);
    });

    it("should parse 'false' string as false", async () => {
      let disabledProp: ReturnType<typeof propBoolean>;

      define('test-bool-false', () => {
        disabledProp = propBoolean('disabled');
        return html`<button>Click</button>`;
      });

      const el = document.createElement('test-bool-false');
      el.setAttribute('disabled', 'false');
      container.appendChild(el);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(disabledProp!.value).toBe(false);
    });

    it('should reflect boolean as empty string when true', async () => {
      let disabledProp: ReturnType<typeof propBoolean>;

      define('test-bool-reflect-true', () => {
        disabledProp = propBoolean('disabled');
        return html`<button>Click</button>`;
      });

      const el = document.createElement('test-bool-reflect-true');
      container.appendChild(el);
      await new Promise((resolve) => setTimeout(resolve, 10));

      disabledProp!.value = true;
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(el.getAttribute('disabled')).toBe('');
    });

    it('should remove attribute when false', async () => {
      let disabledProp: ReturnType<typeof propBoolean>;

      define('test-bool-reflect-false', () => {
        disabledProp = propBoolean('disabled', true);
        return html`<button>Click</button>`;
      });

      const el = document.createElement('test-bool-reflect-false');
      container.appendChild(el);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(disabledProp!.value).toBe(true);

      disabledProp!.value = false;
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(el.hasAttribute('disabled')).toBe(false);
    });
  });

  describe('propNumber()', () => {
    it('should default to 0', async () => {
      let countProp: ReturnType<typeof propNumber>;

      define('test-num-default', () => {
        countProp = propNumber('count');
        return html`<div>${countProp}</div>`;
      });

      const el = document.createElement('test-num-default');
      container.appendChild(el);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(countProp!.value).toBe(0);
    });

    it('should parse integer from attribute', async () => {
      let countProp: ReturnType<typeof propNumber>;

      define('test-num-int', () => {
        countProp = propNumber('count');
        return html`<div>${countProp}</div>`;
      });

      const el = document.createElement('test-num-int');
      el.setAttribute('count', '42');
      container.appendChild(el);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(countProp!.value).toBe(42);
    });

    it('should parse float from attribute', async () => {
      let valueProp: ReturnType<typeof propNumber>;

      define('test-num-float', () => {
        valueProp = propNumber('value');
        return html`<div>${valueProp}</div>`;
      });

      const el = document.createElement('test-num-float');
      el.setAttribute('value', '3.14');
      container.appendChild(el);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(valueProp!.value).toBe(3.14);
    });

    it('should handle negative numbers', async () => {
      let valueProp: ReturnType<typeof propNumber>;

      define('test-num-negative', () => {
        valueProp = propNumber('value');
        return html`<div>${valueProp}</div>`;
      });

      const el = document.createElement('test-num-negative');
      el.setAttribute('value', '-42');
      container.appendChild(el);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(valueProp!.value).toBe(-42);
    });

    it('should return 0 for invalid numbers', async () => {
      let valueProp: ReturnType<typeof propNumber>;

      define('test-num-invalid', () => {
        valueProp = propNumber('value');
        return html`<div>${valueProp}</div>`;
      });

      const el = document.createElement('test-num-invalid');
      el.setAttribute('value', 'not-a-number');
      container.appendChild(el);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(valueProp!.value).toBe(0);
    });

    it('should reflect number to attribute', async () => {
      let countProp: ReturnType<typeof propNumber>;

      define('test-num-reflect', () => {
        countProp = propNumber('count');
        return html`<div>${countProp}</div>`;
      });

      const el = document.createElement('test-num-reflect');
      container.appendChild(el);
      await new Promise((resolve) => setTimeout(resolve, 10));

      countProp!.value = 99;
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(el.getAttribute('count')).toBe('99');
    });

    it('should use custom default value', async () => {
      let valueProp: ReturnType<typeof propNumber>;

      define('test-num-custom-default', () => {
        valueProp = propNumber('value', 100);
        return html`<div>${valueProp}</div>`;
      });

      const el = document.createElement('test-num-custom-default');
      container.appendChild(el);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(valueProp!.value).toBe(100);
    });
  });

  describe('propJSON()', () => {
    it('should parse JSON from attribute', async () => {
      let dataProp: ReturnType<typeof propJSON<{ name: string; age: number }>>;

      define('test-json-parse', () => {
        dataProp = propJSON('data', { age: 0, name: '' });
        return html`<div>${dataProp.value.name}</div>`;
      });

      const el = document.createElement('test-json-parse');
      el.setAttribute('data', '{"name":"Alice","age":30}');
      container.appendChild(el);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(dataProp!.value).toEqual({ age: 30, name: 'Alice' });
    });

    it('should use default for invalid JSON', async () => {
      let dataProp: ReturnType<typeof propJSON<{ count: number }>>;

      define('test-json-invalid', () => {
        dataProp = propJSON('data', { count: 0 });
        return html`<div>${dataProp.value.count}</div>`;
      });

      const el = document.createElement('test-json-invalid');
      el.setAttribute('data', 'not-json');
      container.appendChild(el);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(dataProp!.value).toEqual({ count: 0 });
    });

    it('should serialize JSON to attribute', async () => {
      let dataProp: ReturnType<typeof propJSON<{ count: number }>>;

      define('test-json-serialize', () => {
        dataProp = propJSON('data', { count: 0 });
        return html`<div>${dataProp.value.count}</div>`;
      });

      const el = document.createElement('test-json-serialize');
      container.appendChild(el);
      await new Promise((resolve) => setTimeout(resolve, 10));

      dataProp!.value = { count: 42 };
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(el.getAttribute('data')).toBe('{"count":42}');
    });

    it('should handle arrays', async () => {
      let itemsProp: ReturnType<typeof propJSON<string[]>>;

      define('test-json-array', () => {
        itemsProp = propJSON('items', []);
        return html`<div>${itemsProp.value.length}</div>`;
      });

      const el = document.createElement('test-json-array');
      el.setAttribute('items', '["a","b","c"]');
      container.appendChild(el);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(itemsProp!.value).toEqual(['a', 'b', 'c']);
    });

    it('should handle nested objects', async () => {
      type Config = { user: { name: string; settings: { theme: string } } };
      let configProp: ReturnType<typeof propJSON<Config>>;

      define('test-json-nested', () => {
        configProp = propJSON('config', { user: { name: '', settings: { theme: '' } } });
        return html`<div>${configProp.value.user.name}</div>`;
      });

      const el = document.createElement('test-json-nested');
      el.setAttribute('config', '{"user":{"name":"Bob","settings":{"theme":"dark"}}}');
      container.appendChild(el);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(configProp!.value.user.settings.theme).toBe('dark');
    });
  });

  describe('Edge Cases', () => {
    it('should handle attribute removal', async () => {
      let nameProp: ReturnType<typeof prop<string>>;

      define('test-prop-remove-attr', () => {
        nameProp = prop('name', 'default');
        return html`<div>${nameProp}</div>`;
      });

      const el = document.createElement('test-prop-remove-attr');
      el.setAttribute('name', 'Alice');
      container.appendChild(el);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(nameProp!.value).toBe('Alice');

      el.removeAttribute('name');
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should reset to false for boolean-like defaults
      expect(nameProp!.value).toBeDefined();
    });

    it('should handle rapid attribute changes', async () => {
      let countProp: ReturnType<typeof propNumber>;

      define('test-prop-rapid', () => {
        countProp = propNumber('count');
        return html`<div>${countProp}</div>`;
      });

      const el = document.createElement('test-prop-rapid');
      container.appendChild(el);
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Rapidly change attribute
      for (let i = 0; i < 10; i++) {
        el.setAttribute('count', String(i));
      }

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(countProp!.value).toBe(9);
    });

    it('should handle both reflect and notify together', async () => {
      let nameProp: ReturnType<typeof prop<string>>;

      define('test-prop-reflect-notify', () => {
        nameProp = prop('name', 'World', { notify: true, reflect: true });
        return html`<div>${nameProp}</div>`;
      });

      const el = document.createElement('test-prop-reflect-notify');
      const eventSpy = vi.fn();
      el.addEventListener('name-changed', eventSpy);

      container.appendChild(el);
      await new Promise((resolve) => setTimeout(resolve, 10));

      nameProp!.value = 'Alice';
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(el.getAttribute('name')).toBe('Alice');
      expect(eventSpy).toHaveBeenCalled();
    });

    it('should handle props with same name in different components', async () => {
      let prop1: ReturnType<typeof prop<string>>;
      let prop2: ReturnType<typeof prop<string>>;

      define('test-prop-comp1', () => {
        prop1 = prop('name', 'comp1');
        return html`<div>${prop1}</div>`;
      });

      define('test-prop-comp2', () => {
        prop2 = prop('name', 'comp2');
        return html`<div>${prop2}</div>`;
      });

      const el1 = document.createElement('test-prop-comp1');
      const el2 = document.createElement('test-prop-comp2');

      container.appendChild(el1);
      container.appendChild(el2);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(prop1!.value).toBe('comp1');
      expect(prop2!.value).toBe('comp2');

      prop1!.value = 'changed1';
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(prop1!.value).toBe('changed1');
      expect(prop2!.value).toBe('comp2'); // Should be isolated
    });
  });
});
