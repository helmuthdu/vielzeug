/**
 * Craftit - Context System Tests
 * Tests for component context management
 */

import {
  type ComponentContext,
  createInjectionKey,
  getContext,
  hasInjection,
  inject,
  maybeGetContext,
  onCleanup,
  provide,
  runCleanups,
  setContext,
} from '../context';
import { define, html, mount, onMount } from '..';

describe('Context System', () => {
  describe('setContext() and getContext()', () => {
    it('should set and get context', () => {
      const mockContext: ComponentContext = {
        cleanups: new Set(),
        element: document.createElement('div'),
        mountCallbacks: [],
        mounted: false,
        name: 'test-component',
        parent: null,
        provides: new Map(),
        shadow: document.createElement('div').attachShadow({ mode: 'open' }),
        unmountCallbacks: [],
        updateCallbacks: [],
      };

      setContext(mockContext);
      const context = getContext();

      expect(context).toBe(mockContext);
    });

    it('should throw error when no context is set', () => {
      setContext(null);

      expect(() => getContext()).toThrow();
      expect(() => getContext()).toThrow(/No component context available/);
    });

    it('should provide helpful error message', () => {
      setContext(null);

      expect(() => getContext()).toThrow(/inside a component setup function/);
    });

    it('should allow setting context to null', () => {
      const mockContext: ComponentContext = {
        cleanups: new Set(),
        element: document.createElement('div'),
        mountCallbacks: [],
        mounted: false,
        name: 'test',
        parent: null,
        provides: new Map(),
        shadow: document.createElement('div').attachShadow({ mode: 'open' }),
        unmountCallbacks: [],
        updateCallbacks: [],
      };

      setContext(mockContext);
      setContext(null);

      expect(() => getContext()).toThrow();
    });

    it('should overwrite previous context', () => {
      const context1: ComponentContext = {
        cleanups: new Set(),
        element: document.createElement('div'),
        mountCallbacks: [],
        mounted: false,
        name: 'component-1',
        parent: null,
        provides: new Map(),
        shadow: document.createElement('div').attachShadow({ mode: 'open' }),
        unmountCallbacks: [],
        updateCallbacks: [],
      };

      const context2: ComponentContext = {
        cleanups: new Set(),
        element: document.createElement('div'),
        mountCallbacks: [],
        mounted: false,
        name: 'component-2',
        parent: null,
        provides: new Map(),
        shadow: document.createElement('div').attachShadow({ mode: 'open' }),
        unmountCallbacks: [],
        updateCallbacks: [],
      };

      setContext(context1);
      expect(getContext().name).toBe('component-1');

      setContext(context2);
      expect(getContext().name).toBe('component-2');
    });
  });

  describe('maybeGetContext()', () => {
    it('should return context when set', () => {
      const mockContext: ComponentContext = {
        cleanups: new Set(),
        element: document.createElement('div'),
        mountCallbacks: [],
        mounted: false,
        name: 'test',
        parent: null,
        provides: new Map(),
        shadow: document.createElement('div').attachShadow({ mode: 'open' }),
        unmountCallbacks: [],
        updateCallbacks: [],
      };

      setContext(mockContext);
      const context = maybeGetContext();

      expect(context).toBe(mockContext);
    });

    it('should return null when no context is set', () => {
      setContext(null);
      const context = maybeGetContext();

      expect(context).toBeNull();
    });

    it('should not throw error when no context', () => {
      setContext(null);

      expect(() => maybeGetContext()).not.toThrow();
    });
  });

  describe('onCleanup()', () => {
    it('should register cleanup function', () => {
      const mockContext: ComponentContext = {
        cleanups: new Set(),
        element: document.createElement('div'),
        mountCallbacks: [],
        mounted: false,
        name: 'test',
        parent: null,
        provides: new Map(),
        shadow: document.createElement('div').attachShadow({ mode: 'open' }),
        unmountCallbacks: [],
        updateCallbacks: [],
      };

      setContext(mockContext);

      const cleanup = vi.fn();
      onCleanup(cleanup);

      expect(mockContext.cleanups.has(cleanup)).toBe(true);
      expect(mockContext.cleanups.size).toBe(1);
    });

    it('should register multiple cleanups', () => {
      const mockContext: ComponentContext = {
        cleanups: new Set(),
        element: document.createElement('div'),
        mountCallbacks: [],
        mounted: false,
        name: 'test',
        parent: null,
        provides: new Map(),
        shadow: document.createElement('div').attachShadow({ mode: 'open' }),
        unmountCallbacks: [],
        updateCallbacks: [],
      };

      setContext(mockContext);

      const cleanup1 = vi.fn();
      const cleanup2 = vi.fn();
      const cleanup3 = vi.fn();

      onCleanup(cleanup1);
      onCleanup(cleanup2);
      onCleanup(cleanup3);

      expect(mockContext.cleanups.size).toBe(3);
    });

    it('should throw when no context', () => {
      setContext(null);

      expect(() => onCleanup(() => {})).toThrow();
    });
  });

  describe('runCleanups()', () => {
    it('should run all cleanup functions', () => {
      const cleanup1 = vi.fn();
      const cleanup2 = vi.fn();
      const cleanup3 = vi.fn();

      const mockContext: ComponentContext = {
        cleanups: new Set([cleanup1, cleanup2, cleanup3]),
        element: document.createElement('div'),
        mountCallbacks: [],
        mounted: false,
        name: 'test',
        parent: null,
        provides: new Map(),
        shadow: document.createElement('div').attachShadow({ mode: 'open' }),
        unmountCallbacks: [],
        updateCallbacks: [],
      };

      runCleanups(mockContext);

      expect(cleanup1).toHaveBeenCalledTimes(1);
      expect(cleanup2).toHaveBeenCalledTimes(1);
      expect(cleanup3).toHaveBeenCalledTimes(1);
    });

    it('should clear cleanups after running', () => {
      const mockContext: ComponentContext = {
        cleanups: new Set([vi.fn(), vi.fn()]),
        element: document.createElement('div'),
        mountCallbacks: [],
        mounted: false,
        name: 'test',
        parent: null,
        provides: new Map(),
        shadow: document.createElement('div').attachShadow({ mode: 'open' }),
        unmountCallbacks: [],
        updateCallbacks: [],
      };

      expect(mockContext.cleanups.size).toBe(2);

      runCleanups(mockContext);

      expect(mockContext.cleanups.size).toBe(0);
    });

    it('should handle errors in cleanup functions', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const goodCleanup = vi.fn();
      const badCleanup = vi.fn(() => {
        throw new Error('Cleanup error');
      });
      const anotherGoodCleanup = vi.fn();

      const mockContext: ComponentContext = {
        cleanups: new Set([goodCleanup, badCleanup, anotherGoodCleanup]),
        element: document.createElement('div'),
        mountCallbacks: [],
        mounted: false,
        name: 'test-component',
        parent: null,
        provides: new Map(),
        shadow: document.createElement('div').attachShadow({ mode: 'open' }),
        unmountCallbacks: [],
        updateCallbacks: [],
      };

      runCleanups(mockContext);

      // All cleanups should be called even if one throws
      expect(goodCleanup).toHaveBeenCalled();
      expect(badCleanup).toHaveBeenCalled();
      expect(anotherGoodCleanup).toHaveBeenCalled();

      // Error should be logged
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should work with empty cleanups', () => {
      const mockContext: ComponentContext = {
        cleanups: new Set(),
        element: document.createElement('div'),
        mountCallbacks: [],
        mounted: false,
        name: 'test',
        parent: null,
        provides: new Map(),
        shadow: document.createElement('div').attachShadow({ mode: 'open' }),
        unmountCallbacks: [],
        updateCallbacks: [],
      };

      expect(() => runCleanups(mockContext)).not.toThrow();
    });
  });

  describe('ComponentContext Structure', () => {
    it('should have all required properties', () => {
      const element = document.createElement('div');
      const shadow = element.attachShadow({ mode: 'open' });

      const context: ComponentContext = {
        cleanups: new Set(),
        element,
        mountCallbacks: [],
        mounted: false,
        name: 'test-component',
        parent: null,
        provides: new Map(),
        shadow,
        unmountCallbacks: [],
        updateCallbacks: [],
      };

      expect(context).toHaveProperty('element');
      expect(context).toHaveProperty('shadow');
      expect(context).toHaveProperty('cleanups');
      expect(context).toHaveProperty('mountCallbacks');
      expect(context).toHaveProperty('unmountCallbacks');
      expect(context).toHaveProperty('updateCallbacks');
      expect(context).toHaveProperty('mounted');
      expect(context).toHaveProperty('name');
      expect(context).toHaveProperty('provides');
      expect(context).toHaveProperty('parent');
    });

    it('should have correct types', () => {
      const element = document.createElement('div');
      const shadow = element.attachShadow({ mode: 'open' });

      const context: ComponentContext = {
        cleanups: new Set(),
        element,
        mountCallbacks: [],
        mounted: false,
        name: 'test',
        parent: null,
        provides: new Map(),
        shadow,
        unmountCallbacks: [],
        updateCallbacks: [],
      };

      expect(context.element).toBeInstanceOf(HTMLElement);
      expect(context.shadow).toBeInstanceOf(ShadowRoot);
      expect(context.cleanups).toBeInstanceOf(Set);
      expect(Array.isArray(context.mountCallbacks)).toBe(true);
      expect(Array.isArray(context.unmountCallbacks)).toBe(true);
      expect(Array.isArray(context.updateCallbacks)).toBe(true);
      expect(typeof context.mounted).toBe('boolean');
      expect(typeof context.name).toBe('string');
    });
  });

  describe('Integration with Components', () => {
    let container: HTMLElement;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
    });

    afterEach(() => {
      container.remove();
      setContext(null); // Clean up context
    });

    it('should provide context in component setup', async () => {
      let contextAvailable = false;

      define('test-context-available', () => {
        const context = maybeGetContext();
        contextAvailable = context !== null;
        return html`<div>Test</div>`;
      });

      const el = document.createElement('test-context-available');
      container.appendChild(el);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(contextAvailable).toBe(true);
    });

    it('should allow onCleanup in setup', async () => {
      const cleanupSpy = vi.fn();

      define('test-cleanup-in-setup', () => {
        onCleanup(cleanupSpy);
        return html`<div>Test</div>`;
      });

      const el = document.createElement('test-cleanup-in-setup');
      container.appendChild(el);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(cleanupSpy).not.toHaveBeenCalled();

      el.remove();
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(cleanupSpy).toHaveBeenCalledTimes(1);
    });

    it('should run multiple cleanups on unmount', async () => {
      const cleanup1 = vi.fn();
      const cleanup2 = vi.fn();
      const cleanup3 = vi.fn();

      define('test-multiple-cleanups', () => {
        onCleanup(cleanup1);
        onCleanup(cleanup2);
        onCleanup(cleanup3);
        return html`<div>Test</div>`;
      });

      const el = document.createElement('test-multiple-cleanups');
      container.appendChild(el);
      await new Promise((resolve) => setTimeout(resolve, 10));

      el.remove();
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(cleanup1).toHaveBeenCalledTimes(1);
      expect(cleanup2).toHaveBeenCalledTimes(1);
      expect(cleanup3).toHaveBeenCalledTimes(1);
    });

    it('should provide element reference in context', async () => {
      let capturedElement: HTMLElement | null = null;

      define('test-context-element', () => {
        const context = getContext();
        capturedElement = context.element;
        return html`<div>Test</div>`;
      });

      const el = document.createElement('test-context-element');
      container.appendChild(el);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(capturedElement).toBe(el);
    });

    it('should provide shadow root in context', async () => {
      let capturedShadow: ShadowRoot | null = null;

      define('test-context-shadow', () => {
        const context = getContext();
        capturedShadow = context.shadow;
        return html`<div>Test</div>`;
      });

      const el = document.createElement('test-context-shadow');
      container.appendChild(el);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(capturedShadow).toBe(el.shadowRoot);
    });

    it('should track mounted state', async () => {
      let mountedDuringSetup = false;
      let mountedInMount = false;

      define('test-mounted-state', () => {
        const context = getContext();
        mountedDuringSetup = context.mounted;

        onMount(() => {
          mountedInMount = getContext().mounted;
        });

        return html`<div>Test</div>`;
      });

      const el = document.createElement('test-mounted-state');
      container.appendChild(el);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mountedDuringSetup).toBe(false); // Not mounted during setup
      expect(mountedInMount).toBe(true); // Mounted in onMount
    });

    it('should provide component name in context', async () => {
      let capturedName = '';

      define('test-context-name', () => {
        const context = getContext();
        capturedName = context.name;
        return html`<div>Test</div>`;
      });

      const el = document.createElement('test-context-name');
      container.appendChild(el);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(capturedName).toBe('test-context-name');
    });
  });

  describe('Provide/Inject', () => {
    it('should provide and inject values within same component', async () => {
      const ThemeKey = createInjectionKey<string>('theme');
      let injectedValue: string | undefined;

      define('provide-inject-test', () => {
        provide(ThemeKey, 'dark');
        injectedValue = inject(ThemeKey);
        return html`<div>Test</div>`;
      });

      const { waitForUpdates, unmount } = mount('provide-inject-test');
      await waitForUpdates();

      expect(injectedValue).toBe('dark');

      unmount();
    });

    it('should return default value when not provided', async () => {
      const ConfigKey = createInjectionKey<number>('config2');
      let config = 0;

      define('consumer-with-default-key2', () => {
        // Don't provide anything, just inject with default
        config = inject(ConfigKey, 42);
        return html`<div>Test</div>`;
      });

      const { waitForUpdates, unmount } = mount('consumer-with-default-key2');
      await waitForUpdates();

      expect(config).toBe(42);

      unmount();
    });

    it('should work with string keys', async () => {
      let injectedValue: string | undefined;

      define('string-key-test-unique2', () => {
        provide('myTestValue2', 'Hello');
        injectedValue = inject('myTestValue2');
        return html`<div>Test</div>`;
      });

      const { waitForUpdates, unmount } = mount('string-key-test-unique2');
      await waitForUpdates();

      expect(injectedValue).toBe('Hello');

      unmount();
    });

    it('should check if key has been provided using hasInjection', async () => {
      const TestKey = createInjectionKey<string>('hastest2');
      let hasValue = false;
      let hasNotProvidedValue = true;

      define('has-injection-test-unique2', () => {
        provide(TestKey, 'value');
        hasValue = hasInjection(TestKey);
        hasNotProvidedValue = hasInjection(createInjectionKey('notprovided'));
        return html`<div>Test</div>`;
      });

      const { waitForUpdates, unmount } = mount('has-injection-test-unique2');
      await waitForUpdates();

      expect(hasValue).toBe(true);
      expect(hasNotProvidedValue).toBe(false);

      unmount();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid context switching', () => {
      for (let i = 0; i < 100; i++) {
        const context: ComponentContext = {
          cleanups: new Set(),
          element: document.createElement('div'),
          mountCallbacks: [],
          mounted: false,
          name: `component-${i}`,
          parent: null,
          provides: new Map(),
          shadow: document.createElement('div').attachShadow({ mode: 'open' }),
          unmountCallbacks: [],
          updateCallbacks: [],
        };
        setContext(context);
      }

      const current = getContext();
      expect(current.name).toBe('component-99');
    });

    it('should handle cleanup with no functions registered', () => {
      const mockContext: ComponentContext = {
        cleanups: new Set(),
        element: document.createElement('div'),
        mountCallbacks: [],
        mounted: false,
        name: 'test',
        parent: null,
        provides: new Map(),
        shadow: document.createElement('div').attachShadow({ mode: 'open' }),
        unmountCallbacks: [],
        updateCallbacks: [],
      };

      expect(() => runCleanups(mockContext)).not.toThrow();
    });

    it('should allow same cleanup to be registered multiple times', () => {
      const cleanup = vi.fn();

      const mockContext: ComponentContext = {
        cleanups: new Set(),
        element: document.createElement('div'),
        mountCallbacks: [],
        mounted: false,
        name: 'test',
        parent: null,
        provides: new Map(),
        shadow: document.createElement('div').attachShadow({ mode: 'open' }),
        unmountCallbacks: [],
        updateCallbacks: [],
      };

      setContext(mockContext);

      onCleanup(cleanup);
      onCleanup(cleanup);
      onCleanup(cleanup);

      // Set only stores unique values
      expect(mockContext.cleanups.size).toBe(1);

      runCleanups(mockContext);

      // Should only be called once due to Set uniqueness
      expect(cleanup).toHaveBeenCalledTimes(1);
    });
  });
});
