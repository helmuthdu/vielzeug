/**
 * Craftit - HTML Template
 * Tagged template literal for creating reactive templates
 */

import { maybeGetContext } from '../composables/context';
import { bindRef, isRef, type Ref } from '../composables/ref';
import { runUpdateCallbacks } from '../core/lifecycle';
import { type ComputedSignal, effect, type Signal } from '../core/signal';
import { isDirective, listStates } from './directives';
import { type KeyedListState, makeKeyedListReactive } from './reconciliation';

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
 * Normalize style object to CSS string
 */
function normalizeStyle(value: Record<string, string | number> | null | undefined): string {
  if (!value) return '';

  return Object.entries(value)
    .map(([key, val]) => {
      // Convert camelCase to kebab-case
      const cssKey = key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
      const cssValue = typeof val === 'number' && !key.match(/opacity|weight|zIndex/i) ? `${val}px` : val;
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
 * Fragment symbol for multi-root templates
 */
export const Fragment = Symbol('Fragment');

/**
 * Check if value is a signal
 */
function isSignal(value: unknown): value is Signal<unknown> | ComputedSignal<unknown> {
  return (
    value !== null &&
    typeof value === 'object' &&
    'value' in value &&
    'peek' in value &&
    typeof (value as Signal<unknown>).peek === 'function'
  );
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
  const { strings } = template;

  // Check cache for parsed template structure
  let fragment: DocumentFragment;
  const cached = templateCache.get(strings);

  // Always need to process template for current bindings
  const bindings: Binding[] = [];

  if (cached) {
    // Use cached structure (clone it)
    fragment = cached.fragment.cloneNode(true) as DocumentFragment;
    // Still need to process template to get current binding values
    processTemplateRecursive(template, bindings);
  } else {
    // Not in cache - parse template structure
    const htmlString = processTemplateRecursive(template, bindings);
    fragment = parseHTML(htmlString);

    // Cache the parsed structure for future use
    templateCache.set(strings, {
      bindings: [], // Bindings are regenerated each time
      fragment: fragment.cloneNode(true) as DocumentFragment,
    });
  }

  // Process bindings with current values
  processBindings(fragment, bindings);

  // Replace content
  // Support fragments - can have multiple root nodes
  target.innerHTML = '';
  target.appendChild(fragment);
}

/**
 * Create a fragment template (multiple root nodes)
 *
 * @example
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
  const combined = templates.map((t) => (typeof t === 'string' ? t : processTemplateRecursive(t, []))).join('');

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
function processTemplateRecursive(template: TemplateResult, bindings: Binding[]): string {
  const { strings, values } = template;
  let htmlString = '';

  for (let i = 0; i < strings.length; i++) {
    const str = strings[i];
    htmlString += str;

    if (i < values.length) {
      const value = values[i];

      // Check if this is an attribute context
      const lastPart = str.trimEnd();
      const attrMatch = lastPart.match(/\s+([@\w][-\w.]*)\s*=\s*["']?$/);

      if (attrMatch) {
        const attrName = attrMatch[1];

        // Boolean property binding (.property)
        const isBooleanProp = attrName.startsWith('.');
        const propName = isBooleanProp ? attrName.slice(1) : attrName;

        if (isEventHandler(attrName)) {
          // Event handler with modifier support
          const { name, modifiers } = parseEventName(attrName);
          const index = bindings.length;
          const marker = `__event_${index}__`;
          bindings.push({
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
          bindings.push({
            marker,
            ref: value,
            type: 'ref',
          });
          htmlString += `"${marker}"`;
        } else if (isSignal(value)) {
          // Signal in attribute or property
          const index = bindings.length;
          const marker = `__signal_${index}__`;
          bindings.push({
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
            bindings.push({
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
            bindings.push({
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
            // For boolean attributes, false means remove the attribute entirely
            // We'll use an empty marker that gets removed during processing
            if (value) {
              htmlString += '""'; // Present = true
            } else {
              // Skip adding the attribute entirely by using a removable marker
              const index = bindings.length;
              const marker = `__remove_attr_${index}__`;
              bindings.push({
                attr: propName,
                marker,
                type: 'remove-attr',
              });
              htmlString += `"${marker}"`;
            }
          } else {
            htmlString += `"${escapeHtml(String(value ?? ''))}"`;
          }
        }
      } else {
        // Text content
        if (isDirective(value)) {
          // Handle directives
          const directive = value as any;
          const index = bindings.length;
          const marker = `<!--directive-${index}-->`;

          if (directive.type === 'when') {
            bindings.push({
              condition: directive.condition,
              elseTemplate: directive.elseTemplate,
              inverse: directive.inverse,
              marker,
              template: directive.template,
              type: 'directive-when',
            });
          } else if (directive.type === 'show') {
            bindings.push({
              condition: directive.condition,
              marker,
              template: directive.template,
              type: 'directive-show',
            });
          } else if (directive.type === 'each') {
            bindings.push({
              fallback: directive.fallback,
              items: directive.items,
              keyFn: directive.keyFn,
              marker,
              template: directive.template,
              type: 'directive-each',
            });
          } else if (directive.type === 'log') {
            bindings.push({
              label: directive.label,
              marker,
              type: 'directive-log',
              value: directive.value,
            });
          } else if (directive.type === 'portal') {
            bindings.push({
              marker,
              target: directive.target,
              template: directive.template,
              type: 'directive-portal',
            });
          }

          htmlString += marker;
        } else if (isSignal(value)) {
          const index = bindings.length;
          const textNodeId = `signal-${index}`;
          const marker = `<!--${textNodeId}-->`;
          bindings.push({
            index,
            marker,
            signal: value,
            type: 'signal-text',
          });
          htmlString += marker;
        } else if (Array.isArray(value)) {
          // Array of template results
          for (const item of value) {
            if (typeof item === 'object' && item !== null && 'type' in item) {
              htmlString += processTemplateRecursive(item as TemplateResult, bindings);
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
          htmlString += processTemplateRecursive(value as TemplateResult, bindings);
        } else {
          // Regular text
          htmlString += escapeHtml(String(value ?? ''));
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
      inverse?: boolean;
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
 */
function processBindings(root: DocumentFragment, bindings: Binding[]): void {
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

    for (const binding of bindings) {
      // Handle signal text bindings
      if (binding.type === 'signal-text') {
        const expectedMarker = `signal-${binding.index}`;
        if (text === expectedMarker) {
          // Create text node for signal
          const textNode = document.createTextNode('');

          // Capture context for onUpdated callbacks
          const ctx = maybeGetContext();
          let isFirstRun = true;

          // Make it reactive
          effect(() => {
            textNode.textContent = String(binding.signal.value);

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
      }

      // Handle directive-when (unified conditional rendering)
      if (binding.type === 'directive-when') {
        if (text === binding.marker.slice(4, -3)) {
          const marker = comment;

          effect(() => {
            let condition = isSignal(binding.condition)
              ? (binding.condition as Signal<boolean>).value
              : binding.condition;

            // Apply inverse if specified (unless behavior)
            if (binding.inverse) {
              condition = !condition;
            }

            // Remove existing content
            let next = marker.nextSibling;
            while (next && next.nodeType !== Node.COMMENT_NODE) {
              const toRemove = next;
              next = next.nextSibling;
              toRemove.remove();
            }

            // Render appropriate template
            const template = condition ? binding.template : binding.elseTemplate;
            if (template) {
              const content = typeof template === 'function' ? template() : template;
              const fragment = createFragment(content);
              marker.after(fragment);
            }
          });

          break;
        }
      }

      // Handle directive-show
      if (binding.type === 'directive-show') {
        if (text === binding.marker.slice(4, -3)) {
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
      }

      // Handle directive-each (keyed list with optional fallback)
      if (binding.type === 'directive-each') {
        if (text === binding.marker.slice(4, -3)) {
          const marker = comment;
          const state: KeyedListState = {
            keyToNode: new Map(),
            marker: null,
            parent: null,
          };

          listStates.set(marker, state);

          makeKeyedListReactive(marker, binding as any, state);

          break;
        }
      }

      // Handle directive-log (debug logging)
      if (binding.type === 'directive-log') {
        if (text === binding.marker.slice(4, -3)) {
          const label = binding.label || 'Template Debug';

          effect(() => {
            const value = isSignal(binding.value) ? (binding.value as Signal<unknown>).value : binding.value;

            console.log(`[${label}]`, value);
          });

          break;
        }
      }

      // Handle directive-portal (render elsewhere in DOM)
      if (binding.type === 'directive-portal') {
        if (text === binding.marker.slice(4, -3)) {
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
  }

  // Process element attributes
  for (const element of elementNodes) {
    for (const attr of Array.from(element.attributes)) {
      for (const binding of bindings) {
        if (attr.value.includes(binding.marker)) {
          if (binding.type === 'signal-attr') {
            // Check if this should be a property instead
            const useProperty = shouldUseProperty(element.tagName, binding.attr);

            if (useProperty) {
              // Auto-upgrade to property binding
              const setValue = () => {
                (element as any)[binding.attr] = binding.signal.value;
              };
              setValue();
              effect(setValue);
            } else {
              // Regular attribute binding
              const setValue = () => {
                const value = binding.signal.value;
                if (typeof value === 'boolean') {
                  if (value) {
                    element.setAttribute(binding.attr, '');
                  } else {
                    element.removeAttribute(binding.attr);
                  }
                } else {
                  element.setAttribute(binding.attr, String(value));
                }
              };
              setValue();
              effect(setValue);
            }

            // Only remove the attribute if it still contains the marker
            // (if we set a real value, don't remove it)
            if (element.getAttribute(attr.name) === binding.marker) {
              element.removeAttribute(attr.name);
            }
            break; // Move to next attribute
          }

          if (binding.type === 'class-reactive') {
            // Reactive class binding - object or array
            const setValue = () => {
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
            };

            setValue();
            effect(setValue);
            element.removeAttribute(attr.name);
            break;
          }

          if (binding.type === 'remove-attr') {
            // Remove false boolean attribute
            element.removeAttribute(binding.attr);
            element.removeAttribute(attr.name);
            break;
          }

          if (binding.type === 'style-reactive') {
            // Reactive style binding - object
            const setValue = () => {
              const styleValue = binding.value;
              const evaluated: Record<string, string | number> = {};

              for (const [key, val] of Object.entries(styleValue)) {
                evaluated[key] = isSignal(val) ? (val as Signal<string | number>).value : val;
              }

              const result = normalizeStyle(evaluated);
              element.setAttribute('style', result);
            };

            setValue();
            effect(setValue);
            element.removeAttribute(attr.name);
            break;
          }

          if (binding.type === 'signal-prop') {
            // Reactive property (for boolean properties like .checked, .disabled)
            const setValue = () => {
              (element as HTMLElement & Record<string, unknown>)[binding.attr] = binding.signal.value;
            };

            // Set initial value
            setValue();

            // Make it reactive
            effect(setValue);

            // Remove marker attribute
            element.removeAttribute(attr.name);
            break; // Move to next attribute
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

            // Wrap handler to apply modifiers
            if (modifiers.size > 0) {
              handler = (event: Event) => {
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
 * Create DocumentFragment from template result or string
 */
function createFragment(content: TemplateResult | string): DocumentFragment {
  if (typeof content === 'string') {
    const template = document.createElement('template');
    template.innerHTML = content;
    return template.content;
  }

  // For TemplateResult, render it to a temp container
  const container = document.createElement('div');
  renderTemplate(content, container);

  const fragment = document.createDocumentFragment();
  while (container.firstChild) {
    fragment.appendChild(container.firstChild);
  }

  return fragment;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
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
  return Object.entries(styles)
    .filter(([_, value]) => value !== undefined && value !== null)
    .map(([key, value]) => {
      const cssKey = key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
      const cssValue = typeof value === 'number' && !isUnitlessProperty(key) ? `${value}px` : value;
      return `${cssKey}:${cssValue}`;
    })
    .join(';');
};

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
 * Render raw HTML without escaping (UNSAFE - use with caution!)
 *
 * ⚠️ WARNING: This can expose your application to XSS attacks if used with
 * untrusted content. Only use with content you control or have sanitized.
 *
 * @example Safe usage (static content)
 * html.unsafe('<div class="highlight">Formatted text</div>')
 *
 * @example DANGEROUS (user content - DON'T DO THIS!)
 * html.unsafe(userInput) // ❌ XSS vulnerability!
 *
 * @example Safe with sanitization
 * import DOMPurify from 'dompurify';
 * html.unsafe(DOMPurify.sanitize(userInput)) // ✅ Safe
 *
 * Returns a special marker that will be processed during rendering
 */
html.unsafe = (htmlContent: string): TemplateResult => {
  // Development warning (check for NODE_ENV safely)
  if (typeof globalThis !== 'undefined') {
    const isDev = !(globalThis as any).__CRAFTIT_PROD__;
    if (isDev) {
      console.warn('[Craftit] html.unsafe() used - ensure content is trusted or sanitized to prevent XSS attacks');
    }
  }

  // Create a special template result that marks this as unsafe HTML
  return {
    strings: ['', ''] as unknown as TemplateStringsArray,
    type: 'template',
    values: [{ __unsafeHTML: htmlContent }],
  };
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
 * @example Unless behavior (inverse)
 * html.when(isHidden, {
 *   then: () => html`<div>Content</div>`,
 *   unless: true  // Renders when condition is falsy
 * })
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
        unless?: boolean;
      },
): any => {
  // Handle simple case: html.when(condition, template)
  if (typeof templateOrOptions === 'function' || typeof templateOrOptions === 'string' || 'type' in templateOrOptions) {
    return {
      condition,
      template: templateOrOptions,
      type: 'when',
    };
  }

  // Handle options object
  const { then: template, else: elseTemplate, unless: inverse } = templateOrOptions;
  return {
    condition,
    elseTemplate,
    inverse,
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
): any => {
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
): any => {
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
html.log = (value: unknown, label?: string): any => {
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
html.portal = (template: TemplateResult | string, target: string | Element): any => {
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
