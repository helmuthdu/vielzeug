/**
 * Craftit - HTML Template
 * Tagged template literal for creating reactive templates
 */

import { maybeGetContext } from '../composables/context';
import { bindRef, isRef, type Ref } from '../composables/ref';
import { runUpdateCallbacks } from '../core/lifecycle';
import { ComputedSignal, effect, Signal, untrack } from '../core/signal';
import { isSignal } from '../core/types';
import { toKebab } from '../utils/string';
import { createFragment, setRenderTemplate } from './_common';
import {
  type EachDirective,
  isDirective,
  listStates,
  type LogDirective,
  type PortalDirective,
  type ShowDirective,
  type WhenDirective,
} from './directives';
import { type KeyedListState, makeKeyedListReactive } from './reconciliation';
import { escapeHTML as escapeHtml } from './sanitize';

// Global tracing for browser debugging
const CRAFTIT_TRACE = ((window as any).CRAFTIT_TRACE = (window as any).CRAFTIT_TRACE || []);
function trace(msg: string, data?: any) {
  CRAFTIT_TRACE.push({ time: Date.now(), msg, data });
}

/**
 * Template cache for performance optimization
 * Caches parsed template structure keyed by TemplateStringsArray
 */
const templateCache = new WeakMap<
  TemplateStringsArray,
  {
    fragment: DocumentFragment;
    bindings: Binding[];
  }
>();

/**
 * HTML Properties Map
 * Maps HTML elements to their properties that should use property binding
 */
const ELEMENT_PROPERTIES: Record<string, Set<string>> = {
  AUDIO: new Set(['src', 'muted', 'volume', 'currentTime', 'loop', 'autoplay']),
  BUTTON: new Set(['disabled', 'type']),
  DETAILS: new Set(['open']),
  DIALOG: new Set(['open']),
  FIELDSET: new Set(['disabled']),
  IFRAME: new Set(['src']),
  IMG: new Set(['src', 'alt']),
  INPUT: new Set([
    'value',
    'checked',
    'disabled',
    'readOnly',
    'required',
    'min',
    'max',
    'step',
    'pattern',
    'placeholder',
    'autocomplete',
    'autofocus',
    'multiple',
    'accept',
    'defaultValue',
    'defaultChecked',
    'indeterminate',
  ]),
  OPTGROUP: new Set(['disabled']),
  OPTION: new Set(['selected', 'disabled', 'value', 'defaultSelected']),
  SELECT: new Set(['value', 'disabled', 'required', 'selectedIndex', 'multiple', 'size']),
  TEXTAREA: new Set(['value', 'disabled', 'readOnly', 'required', 'placeholder', 'defaultValue']),
  VIDEO: new Set(['src', 'muted', 'volume', 'currentTime', 'poster', 'loop', 'autoplay']),
};

/**
 * Check if an attribute should use property binding based on element type
 */
function shouldUseProperty(tagName: string, attrName: string): boolean {
  const props = ELEMENT_PROPERTIES[tagName.toUpperCase()];
  return props?.has(attrName) ?? false;
}

/**
 * Normalize class value to string
 * Supports: string, object, array, or signal of any of these
 */
function normalizeClass(
  value: string | Record<string, boolean> | Array<string | false | null | undefined> | null | undefined,
): string {
  if (!value) return '';
  if (typeof value === 'string') return value;

  if (Array.isArray(value)) {
    return value.filter(Boolean).join(' ');
  }

  if (typeof value === 'object') {
    return Object.entries(value)
      .filter(([_, v]) => v)
      .map(([k]) => k)
      .join(' ');
  }

  return '';
}

/**
 * Check if CSS property is unitless
 */
function isUnitlessProperty(prop: string): boolean {
  const unitlessProps = new Set([
    'opacity',
    'zIndex',
    'fontWeight',
    'lineHeight',
    'flex',
    'flexGrow',
    'flexShrink',
    'order',
    'zoom',
  ]);
  return unitlessProps.has(prop);
}

/**
 * Normalize style object to CSS string
 */
function normalizeStyle(value: Record<string, string | number> | null | undefined): string {
  if (!value) return '';

  return Object.entries(value)
    .map(([key, val]) => {
      const cssKey = toKebab(key);
      const cssValue = typeof val === 'number' && !isUnitlessProperty(key) ? `${val}px` : val;
      return `${cssKey}:${cssValue}`;
    })
    .join(';');
}

/**
 * Template result type
 */
export interface TemplateResult {
  type: 'template';
  strings: TemplateStringsArray;
  values: unknown[];
}

/**
 * Check if value is an event handler (function with @ prefix in attribute)
 */
function isEventHandler(attrName: string): boolean {
  return attrName.startsWith('@');
}

/**
 * Parse event name and modifiers from attribute name
 * Examples: @click.prevent.stop, @submit.prevent, @keydown.once
 */
function parseEventName(attrName: string): {
  name: string;
  modifiers: Set<string>;
} {
  const parts = attrName.slice(1).split('.'); // Remove @ and split by .
  const name = parts[0];
  const modifiers = new Set(parts.slice(1));
  return { modifiers, name };
}

/**
 * HTML tagged template function
 */
export function html(strings: TemplateStringsArray, ...values: unknown[]): TemplateResult {
  return {
    strings,
    type: 'template',
    values,
  };
}

/**
 * Render a template to a target element
 * Uses caching for performance - templates with same strings are only parsed once
 * Supports fragments (multiple root nodes)
 */
export function renderTemplate(template: TemplateResult, target: Element | ShadowRoot): void {
  // Check if root is a Directive
  const directive = template as any;
  if (isDirective(directive)) {
    const marker = document.createComment(`directive-root`);
    target.innerHTML = '';
    target.appendChild(marker);

    trace(`renderTemplate:directive:${directive.type}`, { target });
    if (directive.type === 'each') {
      const state: KeyedListState = {
        keyToNode: new Map(),
        marker: null,
      };
      listStates.set(marker, state);
      makeKeyedListReactive(marker, directive, state);
    } else if (directive.type === 'when') {
      const wrapper = document.createElement('div');
      wrapper.style.display = 'contents';
      target.appendChild(wrapper);

      let lastCondition: boolean | undefined;

      effect(() => {
        const condition = !!(isSignal(directive.condition)
          ? (directive.condition as Signal<boolean>).value
          : directive.condition);

        if (condition === lastCondition) return;
        lastCondition = condition;

        // Clear wrapper
        wrapper.innerHTML = '';

        const content = condition ? directive.template : directive.elseTemplate;
        if (content) {
          const result = untrack(() => (typeof content === 'function' ? content() : content));
          wrapper.appendChild(createFragment(result));
        }
      });
    }
    return;
  }

  const { strings } = template;

  // Check cache for parsed template structure
  let fragment: DocumentFragment;
  const cached = templateCache.get(strings);

  // Always need to process template for current bindings
  const bindings: Binding[] = [];
  const bindingsByMarker = new Map<string, Binding[]>();

  if (cached) {
    // Use cached structure (clone it)
    fragment = cached.fragment.cloneNode(true) as DocumentFragment;
    // Still need to process template to get current binding values
    processTemplateRecursive(template, bindings, bindingsByMarker);
  } else {
    // Not in cache - parse template structure
    const htmlString = processTemplateRecursive(template, bindings, bindingsByMarker);
    fragment = parseHTML(htmlString);

    // Cache the parsed structure for future use
    templateCache.set(strings, {
      bindings: [], // Bindings are regenerated each time
      fragment: fragment.cloneNode(true) as DocumentFragment,
    });
  }

  // Process bindings with current values
  console.log('[renderTemplate] About to call processBindings, bindingsByMarker.size:', bindingsByMarker.size);
  processBindings(fragment, bindingsByMarker);
  console.log('[renderTemplate] processBindings completed');

  // Replace content
  // Support fragments - can have multiple root nodes
  target.innerHTML = '';
  target.appendChild(fragment);
}

// Initialize the renderTemplate reference in utils to break circular dependency
setRenderTemplate(renderTemplate);

/**
 * Create a fragment template (multiple root nodes)
 *
 * **Note:** This creates a static fragment. Any signals or directives
 * in the provided templates will NOT be reactive. Use this only for
 * static content that doesn't need to update.
 *
 * @example Static content only
 * define('list-items', () => {
 *   return html`
 *     <li>Item 1</li>
 *     <li>Item 2</li>
 *     <li>Item 3</li>
 *   `;
 * });
 */
html.fragment = (...templates: (TemplateResult | string)[]): TemplateResult => {
  // Combine multiple templates into one
  const combined = templates
    .map((t) => {
      if (typeof t === 'string') {
        return t;
      }
      const bindings: Binding[] = [];
      const bindingsByMarker = new Map<string, Binding[]>();
      return processTemplateRecursive(t, bindings, bindingsByMarker);
    })
    .join('');

  return {
    strings: [combined, ''] as unknown as TemplateStringsArray,
    type: 'template',
    values: [],
  };
};

/**
 * Process template and return HTML string with bindings
 * This handles nested templates properly
 */
function processTemplateRecursive(
  template: TemplateResult,
  bindings: Binding[],
  bindingsByMarker: Map<string, Binding[]>,
): string {
  const { strings, values } = template;
  let htmlString = '';

  // Helper to add binding to both arrays and map
  const addBinding = (binding: Binding) => {
    bindings.push(binding);
    const list = bindingsByMarker.get(binding.marker) ?? [];
    list.push(binding);
    bindingsByMarker.set(binding.marker, list);
  };

  for (let i = 0; i < strings.length; i++) {
    const str = strings[i];
    htmlString += str;

    if (i < values.length) {
      const value = values[i];

      // Check if this is an attribute context
      const lastPart = str.trimEnd();
      const attrMatch = lastPart.match(/\s+([@:?]?[-\w.]+)\s*=\s*["']?$/);

      if (attrMatch) {
        const attrName = attrMatch[1];

        // Boolean property binding (:property)
        const isBooleanProp = attrName.startsWith(':');
        const propName = isBooleanProp ? attrName.slice(1) : attrName;

        if (isEventHandler(attrName)) {
          // Event handler with modifier support
          const { name, modifiers } = parseEventName(attrName);
          const index = bindings.length;
          const marker = `__event_${index}__`;
          addBinding({
            event: name,
            handler: value as EventListener,
            marker,
            modifiers,
            type: 'event',
          });
          htmlString += `"${marker}"`;
        } else if (isRef(value)) {
          // Ref binding
          const index = bindings.length;
          const marker = `__ref_${index}__`;
          addBinding({
            marker,
            ref: value,
            type: 'ref',
          });
          htmlString += `"${marker}"`;
        } else if (isSignal(value)) {
          // Signal in attribute or property
          const index = bindings.length;
          const marker = `__signal_${index}__`;
          addBinding({
            attr: propName,
            marker,
            signal: value,
            type: isBooleanProp ? 'signal-prop' : 'signal-attr',
          });
          htmlString += `"${marker}"`;
        } else if (propName === 'class' && (typeof value === 'object' || Array.isArray(value)) && value !== null) {
          // Reactive class binding - object or array
          // Check if any values are signals
          const hasSignals = Array.isArray(value)
            ? value.some((v) => isSignal(v))
            : Object.values(value).some((v) => isSignal(v));

          if (hasSignals) {
            // Create reactive binding
            const index = bindings.length;
            const marker = `__class_${index}__`;
            addBinding({
              marker,
              type: 'class-reactive',
              value: value as any,
            });
            htmlString += `"${marker}"`;
          } else {
            // Static class object/array - normalize immediately
            const result = normalizeClass(value as any);
            htmlString += `"${escapeHtml(result)}"`;
          }
        } else if (propName === 'style' && typeof value === 'object' && !Array.isArray(value) && value !== null) {
          // Reactive style binding - object only
          // Check if any values are signals
          const hasSignals = Object.values(value).some((v) => isSignal(v));

          if (hasSignals) {
            // Create reactive binding
            const index = bindings.length;
            const marker = `__style_${index}__`;
            addBinding({
              marker,
              type: 'style-reactive',
              value: value as any,
            });
            htmlString += `"${marker}"`;
          } else {
            // Static style object - normalize immediately
            const result = normalizeStyle(value as any);
            htmlString += `"${escapeHtml(result)}"`;
          }
        } else {
          // Regular value
          // Check if this is a boolean attribute
          const booleanAttrs = [
            'disabled',
            'checked',
            'selected',
            'readonly',
            'required',
            'multiple',
            'autofocus',
            'autoplay',
            'controls',
            'loop',
            'muted',
          ];
          const isBooleanAttr = booleanAttrs.includes(propName.toLowerCase());

          if (isBooleanAttr && typeof value === 'boolean') {
            // For boolean attributes, always create a marker to keep indices stable
            const index = bindings.length;
            const marker = `__remove_attr_${index}__`;
            addBinding({
              attr: propName,
              marker,
              type: 'remove-attr',
              remove: !value, // Only remove if false
            } as any);
            htmlString += `"${marker}"`;
          } else {
            htmlString += `"${escapeHtml(String(value ?? ''))}"`;
          }
        }
      } else {
        // Text content
        if (isDirective(value)) {
          // Handle directives - isDirective narrows type to Directive
          const directive = value;
          const index = bindings.length;
          const marker = `directive-${index}`;

          if (directive.type === 'when') {
            addBinding({
              condition: directive.condition,
              elseTemplate: directive.elseTemplate,
              marker,
              template: directive.template,
              type: 'directive-when',
            });
          } else if (directive.type === 'show') {
            addBinding({
              condition: directive.condition,
              marker,
              template: directive.template,
              type: 'directive-show',
            });
          } else if (directive.type === 'each') {
            addBinding({
              fallback: directive.fallback,
              items: directive.items,
              keyFn: directive.keyFn,
              marker,
              template: directive.template,
              type: 'directive-each',
            });
          } else if (directive.type === 'log') {
            addBinding({
              label: directive.label,
              marker,
              type: 'directive-log',
              value: directive.value,
            });
          } else if (directive.type === 'portal') {
            addBinding({
              marker,
              target: directive.target,
              template: directive.template,
              type: 'directive-portal',
            });
          }

          htmlString += `<!--${marker}-->`;
        } else if (isSignal(value)) {
          const index = bindings.length;
          const marker = `signal-${index}`;
          console.log(
            '[processTemplateRecursive] Signal detected:',
            value,
            'isComputedSignal:',
            value instanceof ComputedSignal,
          );
          addBinding({
            index,
            marker,
            signal: value,
            type: 'signal-text',
          });
          htmlString += `<!--${marker}-->`;
        } else if (Array.isArray(value)) {
          // Array of template results
          for (const item of value) {
            if (typeof item === 'object' && item !== null && 'type' in item) {
              htmlString += processTemplateRecursive(item as TemplateResult, bindings, bindingsByMarker);
            } else {
              htmlString += escapeHtml(String(item ?? ''));
            }
          }
        } else if (
          typeof value === 'object' &&
          value !== null &&
          'type' in value &&
          (value as TemplateResult).type === 'template'
        ) {
          // Nested template - recursively process it
          htmlString += processTemplateRecursive(value as TemplateResult, bindings, bindingsByMarker);
        } else {
          // Regular text - create marker and binding so it can be updated
          const index = bindings.length;
          const marker = `text-${index}`;
          console.log(
            '[processTemplateRecursive] Creating static-text binding for:',
            value,
            'typeof:',
            typeof value,
            'isSignal:',
            isSignal(value),
            'instanceof Signal:',
            value instanceof Signal,
            'instanceof ComputedSignal:',
            value instanceof ComputedSignal,
          );
          addBinding({
            index,
            marker,
            value,
            type: 'static-text',
          });
          htmlString += `<!--${marker}-->`;
        }
      }
    }
  }

  return htmlString;
}

/**
 * Binding types
 */
type Binding =
  | {
      type: 'signal-text';
      marker: string;
      signal: Signal<unknown> | ComputedSignal<unknown>;
      index: number;
    }
  | {
      type: 'static-text';
      marker: string;
      value: unknown;
      index: number;
    }
  | {
      type: 'signal-attr';
      marker: string;
      signal: Signal<unknown> | ComputedSignal<unknown>;
      attr: string;
    }
  | {
      type: 'signal-prop';
      marker: string;
      signal: Signal<unknown> | ComputedSignal<unknown>;
      attr: string;
    }
  | {
      type: 'ref';
      marker: string;
      ref: Ref;
    }
  | {
      type: 'remove-attr';
      marker: string;
      attr: string;
      remove: boolean;
    }
  | {
      type: 'event';
      marker: string;
      handler: EventListener;
      event: string;
      modifiers: Set<string>;
    }
  | {
      type: 'class-reactive';
      marker: string;
      value: Record<string, boolean | Signal<boolean>> | Array<string | false | null | undefined | Signal<string>>;
    }
  | {
      type: 'style-reactive';
      marker: string;
      value: Record<string, string | number | Signal<string | number>>;
    }
  | {
      type: 'directive-when';
      marker: string;
      condition: boolean | Signal<boolean> | ComputedSignal<boolean>;
      template: TemplateResult | string | (() => TemplateResult | string);
      elseTemplate?: TemplateResult | string | (() => TemplateResult | string);
    }
  | {
      type: 'directive-show';
      marker: string;
      condition: boolean | Signal<boolean> | ComputedSignal<boolean>;
      template: TemplateResult | string;
    }
  | {
      type: 'directive-each';
      marker: string;
      items: unknown[] | Signal<unknown[]> | ComputedSignal<unknown[]>;
      keyFn: (item: unknown, index: number) => string | number;
      template: (item: unknown, index: number) => TemplateResult | string;
      fallback?: TemplateResult | string | (() => TemplateResult | string);
    }
  | {
      type: 'directive-log';
      marker: string;
      value: unknown;
      label?: string;
    }
  | {
      type: 'directive-portal';
      marker: string;
      template: TemplateResult | string;
      target: string | Element;
    };

/**
 * Process bindings in DOM
 * Uses bindingsByMarker map for O(1) lookup instead of O(n) scanning
 */
function processBindings(root: DocumentFragment, bindingsByMarker: Map<string, Binding[]>): void {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ALL);

  // Collect all nodes to process first (to avoid mutation during traversal)
  const commentNodes: Comment[] = [];
  const elementNodes: Element[] = [];

  let node: Node | null = walker.nextNode();
  while (node) {
    if (node.nodeType === Node.COMMENT_NODE) {
      commentNodes.push(node as Comment);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      elementNodes.push(node as Element);
    }
    node = walker.nextNode();
  }

  // Process comment nodes (signal markers and directives)
  for (const comment of commentNodes) {
    const text = comment.textContent || '';

    // O(1) lookup instead of O(n) scan
    const matchingBindings = bindingsByMarker.get(text);
    if (!matchingBindings) continue;

    if (text.startsWith('text-')) {
      console.log(
        '[processBindings] Processing text comment:',
        text,
        'bindings:',
        matchingBindings.map((b) => ({ type: b.type, value: (b as any).value })),
      );
    }

    for (const binding of matchingBindings) {
      // Handle signal text bindings
      if (binding.type === 'signal-text') {
        console.log('[processBindings] signal-text binding, marker:', binding.marker, 'signal:', binding.signal);
        // Create a text node for signal
        const textNode = document.createTextNode('');

        // Capture context for onUpdated callbacks
        const ctx = maybeGetContext();
        let isFirstRun = true;

        // Make it reactive
        effect(() => {
          const newValue = String(binding.signal.value);
          console.log(
            '[processBindings:signal-text:effect] Updating textNode:',
            binding.marker,
            'new value:',
            newValue,
          );
          textNode.textContent = newValue;

          // Run onUpdated callbacks only after first run (i.e., on actual updates)
          if (ctx?.mounted && !isFirstRun) {
            runUpdateCallbacks(ctx);
          }
          isFirstRun = false;
        });

        // Replace comment with text node
        comment.replaceWith(textNode);
        break;
      }

      // Handle static text bindings (for template caching with dynamic values)
      if (binding.type === 'static-text') {
        console.log('[processBindings] static-text binding, marker:', binding.marker, 'value:', binding.value);
        // Create text node with the current value
        const textNode = document.createTextNode(String(binding.value ?? ''));
        console.log('[processBindings] Replacing comment with textNode:', textNode);

        // Replace comment with text node
        comment.replaceWith(textNode);
        break;
      }

      // Handle directive-when (unified conditional rendering)
      if (binding.type === 'directive-when') {
        const marker = comment;
        const wrapper = document.createElement('div');
        wrapper.style.display = 'contents';
        marker.after(wrapper);

        let lastCondition: boolean | undefined;

        // Use microtask to escape any parent untrack() context
        queueMicrotask(() => {
          effect(() => {
            const condition = !!(isSignal(binding.condition)
              ? (binding.condition as Signal<boolean>).value
              : binding.condition);

            console.log('[directive-when] Effect run, condition:', condition, 'lastCondition:', lastCondition);

            if (condition === lastCondition) {
              console.log('[directive-when] Condition unchanged, skipping');
              return;
            }
            lastCondition = condition;

            console.log('[directive-when] Rendering branch, condition:', condition);

            // Clear wrapper
            wrapper.innerHTML = '';

            // Render appropriate template
            const template = condition ? binding.template : binding.elseTemplate;
            if (template) {
              console.log(
                '[directive-when] Template:',
                template ? (condition ? 'TRUE branch' : 'ELSE branch') : 'none',
              );
              const content = untrack(() => (typeof template === 'function' ? template() : template));
              const fragment = createFragment(content);
              wrapper.appendChild(fragment);
            }
          });
        });

        // Do initial sync render
        const initialCondition = !!(isSignal(binding.condition)
          ? (binding.condition as Signal<boolean>).value
          : binding.condition);
        lastCondition = initialCondition;
        const initialTemplate = initialCondition ? binding.template : binding.elseTemplate;
        if (initialTemplate) {
          const content = untrack(() => (typeof initialTemplate === 'function' ? initialTemplate() : initialTemplate));
          const fragment = createFragment(content);
          wrapper.appendChild(fragment);
        }

        break;
      }

      // Handle directive-show
      if (binding.type === 'directive-show') {
        const marker = comment;
        const content = binding.template;
        const fragment = createFragment(content);
        const wrapper = document.createElement('div');
        wrapper.style.display = 'contents';
        wrapper.append(fragment);
        marker.after(wrapper);

        effect(() => {
          const condition = isSignal(binding.condition)
            ? (binding.condition as Signal<boolean>).value
            : binding.condition;
          wrapper.style.display = condition ? 'contents' : 'none';
        });

        break;
      }

      if (binding.type === 'directive-each') {
        const marker = comment;
        const state: KeyedListState = {
          keyToNode: new Map(),
          marker: null,
        };

        listStates.set(marker, state);

        makeKeyedListReactive(marker, binding as unknown as EachDirective<unknown>, state);

        break;
      }

      // Handle directive-log (debug logging)
      if (binding.type === 'directive-log') {
        const label = binding.label || 'Template Debug';

        effect(() => {
          const value = isSignal(binding.value) ? (binding.value as Signal<unknown>).value : binding.value;

          console.log(`[${label}]`, value);
        });

        break;
      }

      // Handle directive-portal (render elsewhere in DOM)
      if (binding.type === 'directive-portal') {
        const marker = comment;
        let portalContainer: Element | null = null;
        let cleanup: (() => void) | null = null;

        // Get or create portal target
        const getPortalTarget = (): Element | null => {
          if (typeof binding.target === 'string') {
            return document.querySelector(binding.target);
          }
          return binding.target;
        };

        // Render portal content
        const renderPortal = () => {
          // Clean up previous render
          if (cleanup) {
            cleanup();
            cleanup = null;
          }

          // Get target element
          portalContainer = getPortalTarget();
          if (!portalContainer) {
            console.warn('[Portal] Target not found:', binding.target);
            return;
          }

          // Render content to portal
          const content = binding.template;
          const fragment = createFragment(content);

          // Clear target and append
          portalContainer.innerHTML = '';
          portalContainer.appendChild(fragment);

          // Setup cleanup
          cleanup = () => {
            if (portalContainer) {
              portalContainer.innerHTML = '';
            }
          };
        };

        // Initial render
        renderPortal();

        // Cleanup when marker is removed
        const observer = new MutationObserver(() => {
          if (!marker.parentNode) {
            if (cleanup) {
              cleanup();
            }
            observer.disconnect();
          }
        });

        if (marker.parentNode) {
          observer.observe(marker.parentNode, { childList: true });
        }

        break;
      }
    }
  }

  // Process element attributes
  for (const element of elementNodes) {
    for (const attr of Array.from(element.attributes)) {
      const attrValue = attr.value;

      // O(1) lookup instead of O(n) scan
      const matchingBindings = bindingsByMarker.get(attrValue);
      if (!matchingBindings) continue;

      for (const binding of matchingBindings) {
        if (binding.type === 'signal-attr' || binding.type === 'signal-prop') {
          // Check if this should be a property instead
          const b = binding as any;
          const attrName = b.attr;
          const useProperty = binding.type === 'signal-prop' || shouldUseProperty(element.tagName, attrName);

          if (useProperty) {
            // Special handling for text input value - avoid cursor jumping!
            const isTextInputValue =
              (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') &&
              attrName === 'value' &&
              (element as HTMLInputElement).type !== 'checkbox' &&
              (element as HTMLInputElement).type !== 'radio';

            if (isTextInputValue) {
              const inputElement = element as HTMLInputElement;

              // Clear marker if present to avoid immediate overwrite
              if (inputElement.value === b.marker) {
                inputElement.value = '';
              }

              // Watch for signal changes
              effect(() => {
                const newValue = String(b.signal.value);
                const root = inputElement.getRootNode() as ShadowRoot | Document;
                const activeElement = root.activeElement || document.activeElement;
                const isFocused = activeElement === inputElement;

                if (!isFocused || (inputElement.value !== newValue && newValue !== '')) {
                  trace(`input:update:${element.tagName}`, { newValue, isFocused, currentValue: inputElement.value });
                  inputElement.value = newValue;
                }
              });
            } else {
              // Auto-upgrade to property binding with reactive effect
              effect(() => {
                (element as any)[attrName] = b.signal.value;
              });
            }
          } else {
            // Regular attribute binding
            effect(() => {
              const value = b.signal.value;
              if (typeof value === 'boolean') {
                if (value) {
                  element.setAttribute(attrName, '');
                } else {
                  element.removeAttribute(attrName);
                }
              } else {
                element.setAttribute(attrName, String(value));
              }
            });
          }

          // Only remove the attribute if it still contains the marker
          if (element.getAttribute(attr.name) === binding.marker) {
            element.removeAttribute(attr.name);
          }
          continue; // Move to next binding
        }

        if (binding.type === 'class-reactive') {
          // Reactive class binding - object or array
          effect(() => {
            const classValue = binding.value;
            let result: string;

            if (Array.isArray(classValue)) {
              // Handle array - evaluate signals
              const evaluated = classValue.map((v) => (isSignal(v) ? (v as Signal<string>).value : v));
              result = normalizeClass(evaluated);
            } else {
              // Handle object - evaluate signals in values
              const evaluated: Record<string, boolean> = {};
              for (const [key, val] of Object.entries(classValue)) {
                evaluated[key] = isSignal(val) ? (val as Signal<boolean>).value : val;
              }
              result = normalizeClass(evaluated);
            }

            element.setAttribute('class', result);
          });
          element.removeAttribute(attr.name);
          break;
        }

        if (binding.type === 'remove-attr') {
          // Remove/keep boolean attribute based on value
          if (binding.remove) {
            element.removeAttribute(binding.attr);
            element.removeAttribute(attr.name);
          } else {
            // Keep the attribute (set to empty string for boolean attrs)
            element.setAttribute(binding.attr, '');
            element.removeAttribute(attr.name);
          }
          break;
        }

        if (binding.type === 'style-reactive') {
          // Reactive style binding - object
          effect(() => {
            const styleValue = binding.value;
            const evaluated: Record<string, string | number> = {};

            for (const [key, val] of Object.entries(styleValue)) {
              evaluated[key] = isSignal(val) ? (val as Signal<string | number>).value : val;
            }

            const result = normalizeStyle(evaluated);
            element.setAttribute('style', result);
          });
          element.removeAttribute(attr.name);
          break;
        }

        if (binding.type === 'ref') {
          // Ref binding
          bindRef(binding.ref, element);
          element.removeAttribute(attr.name);
          break; // Move to next attribute
        }

        if (binding.type === 'event') {
          // Event handler with modifier support
          const eventName = binding.event;
          const modifiers = binding.modifiers;

          let handler = binding.handler;

          // Key code mapping for keyboard shortcuts
          const keyMap: Record<string, string> = {
            enter: 'Enter',
            esc: 'Escape',
            escape: 'Escape',
            tab: 'Tab',
            space: ' ',
            up: 'ArrowUp',
            down: 'ArrowDown',
            left: 'ArrowLeft',
            right: 'ArrowRight',
            delete: 'Delete',
            backspace: 'Backspace',
          };

          // Wrap handler to apply modifiers
          if (modifiers.size > 0) {
            handler = (event: Event) => {
              // Check for key modifiers first (for keyboard events)
              if (event instanceof KeyboardEvent) {
                for (const modifier of modifiers) {
                  const expectedKey = keyMap[modifier.toLowerCase()];
                  if (expectedKey && event.key !== expectedKey) {
                    return; // Key doesn't match, don't call handler
                  }
                }
              }

              // Apply event modifiers
              if (modifiers.has('prevent')) event.preventDefault();
              if (modifiers.has('stop')) event.stopPropagation();
              if (modifiers.has('self') && event.target !== event.currentTarget) return;

              binding.handler(event);
            };
          }

          // Event listener options from modifiers
          const options: AddEventListenerOptions = {
            capture: modifiers.has('capture'),
            once: modifiers.has('once'),
            passive: modifiers.has('passive'),
          };

          element.addEventListener(eventName, handler, options);
          element.removeAttribute(attr.name);
          break; // Move to next attribute
        }
      }
    }
  }
}

/**
 * Parse HTML string to DocumentFragment
 */
function parseHTML(html: string): DocumentFragment {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  return template.content;
}

/**
 * Create class string from object or array
 *
 * @example
 * html.classes('btn btn-primary')
 * html.classes(['btn', 'btn-primary', isActive && 'active'])
 * html.classes({ btn: true, 'btn-primary': isPrimary, active: isActive })
 */
html.classes = (classes: string | string[] | Record<string, boolean | undefined | null>): string => {
  if (typeof classes === 'string') {
    return classes;
  }

  if (Array.isArray(classes)) {
    return classes.filter(Boolean).join(' ');
  }

  return Object.entries(classes)
    .filter(([_, value]) => Boolean(value))
    .map(([key]) => key)
    .join(' ');
};

/**
 * Create inline style string from object
 */
html.style = (styles: Record<string, string | number | undefined | null>): string => {
  // Filter out null/undefined and use normalizeStyle
  const filtered = Object.fromEntries(
    Object.entries(styles).filter(([_, value]) => value !== undefined && value !== null),
  ) as Record<string, string | number>;

  return normalizeStyle(filtered);
};

/**
 * Conditional rendering directive (#when)
 * Unified directive for all conditional rendering
 *
 * @example Simple condition
 * html.when(isVisible, () => html`<div>Content</div>`)
 *
 * @example With else branch
 * html.when(isVisible, {
 *   then: () => html`<div>Visible</div>`,
 *   else: () => html`<div>Hidden</div>`
 * })
 *
 * @example Unless behavior - just negate the condition
 * html.when(!isHidden, () => html`<div>Content</div>`)
 */
html.when = (
  condition: boolean | Signal<boolean> | ComputedSignal<boolean>,
  templateOrOptions:
    | TemplateResult
    | string
    | (() => TemplateResult | string)
    | {
        then: TemplateResult | string | (() => TemplateResult | string);
        else?: TemplateResult | string | (() => TemplateResult | string);
      },
  elseTemplateParam?: TemplateResult | string | (() => TemplateResult | string),
): WhenDirective => {
  // Handle 3-argument case: html.when(condition, then, else)
  if (elseTemplateParam !== undefined) {
    return {
      condition,
      elseTemplate: elseTemplateParam,
      template: templateOrOptions as TemplateResult | string | (() => TemplateResult | string),
      type: 'when',
    };
  }

  // Handle simple case: html.when(condition, template)
  if (
    typeof templateOrOptions === 'function' ||
    typeof templateOrOptions === 'string' ||
    (typeof templateOrOptions === 'object' && templateOrOptions !== null && 'type' in templateOrOptions)
  ) {
    return {
      condition,
      template: templateOrOptions as TemplateResult | string | (() => TemplateResult | string),
      type: 'when',
    };
  }

  // Handle options object
  const { then: template, else: elseTemplate } = templateOrOptions as {
    then: TemplateResult | string | (() => TemplateResult | string);
    else?: TemplateResult | string | (() => TemplateResult | string);
  };
  return {
    condition,
    elseTemplate,
    template,
    type: 'when',
  };
};

/**
 * Keyed list rendering directive (#each)
 * Efficiently renders lists with reconciliation based on keys
 * Supports optional fallback for empty lists
 *
 * @example
 * html`${html.each(todos, t => t.id, (todo, i) => html`
 *   <li>${todo.text}</li>
 * `, () => html`<p>No todos</p>`)}`
 */
html.each = <T>(
  items: T[] | Signal<T[]> | ComputedSignal<T[]>,
  keyFn: (item: T, index: number) => string | number,
  template: (item: T, index: number) => TemplateResult | string,
  fallback?: TemplateResult | string | (() => TemplateResult | string),
): EachDirective<T> => {
  return {
    fallback,
    items,
    keyFn,
    template,
    type: 'each',
  };
};

/**
 * Show/hide directive (#show)
 * Toggles CSS display property
 *
 * @example
 * html`${html.show(isVisible, html`<div>Content</div>`)}`
 */
html.show = (
  condition: boolean | Signal<boolean> | ComputedSignal<boolean>,
  template: TemplateResult | string,
): ShowDirective => {
  return {
    condition,
    template,
    type: 'show',
  };
};

/**
 * Log directive (#log)
 * Logs values to console for debugging templates
 * Automatically logs when reactive values change
 *
 * @example
 * html`${html.log(count, 'Current count')}`
 * html`${html.log(user)}`
 */
html.log = (value: unknown, label?: string): LogDirective => {
  return {
    label,
    type: 'log',
    value,
  };
};

/**
 * Portal directive (#portal)
 * Renders content in a different location in the DOM
 * Useful for modals, tooltips, dropdowns, etc.
 *
 * @example
 * // Render in specific element
 * html`${html.portal(html`<div>Modal content</div>`, '#modal-root')}`
 *
 * @example
 * // Render in body
 * html`${html.portal(html`<div class="tooltip">Tooltip</div>`, document.body)}`
 */
html.portal = (template: TemplateResult | string, target: string | Element): PortalDirective => {
  return {
    target,
    template,
    type: 'portal',
  };
};

/**
 * Slot helper for web component composition
 * Creates a <slot> element for content projection
 *
 * @example Default slot
 * html`<div class="wrapper">${html.slot()}</div>`
 *
 * @example Named slot
 * html`
 *   <div class="card">
 *     <header>${html.slot('header')}</header>
 *     <main>${html.slot()}</main>
 *     <footer>${html.slot('footer')}</footer>
 *   </div>
 * `
 */
html.slot = (name?: string): TemplateResult => {
  if (name) {
    return html`<slot name=${name}></slot>`;
  }
  return html`<slot></slot>`;
};
