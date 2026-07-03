/**
 * template/instantiator.ts — Template instantiation and the `html` tagged literal.
 *
 * Responsibilities:
 * - Clone a compiled static template and wire up live bindings.
 * - Expose `compileTemplate()` and `html` as the public authoring API.
 */

import { computed, isReactive, type Readable } from '@vielzeug/ripple';

import { warn } from '../_dev';
import {
  type Binding,
  createHtmlResult,
  type HtmlBindingValue,
  type HTMLResult,
  isDirectiveResult,
  isHtmlResult,
  isSpreadObject,
  type Ref,
  type RefCallback,
} from '../types/bindings';
import { applyModifiers } from '../utils/event-modifiers';
import { applyBinding, createAttrBindingFromValue, resolveStaticText } from './bindings';
import { followPath, getStaticTemplate } from './compiler';

// ─── Template instantiation ──────────────────────────────────────────────────

/**
 * Instantiate a compiled template: clone the cached DOM template, navigate
 * to each binding target using pre-recorded paths, and build bindings with
 * direct node references. Returns an HTMLResult whose fragment is ready to insert.
 */
export const compileTemplate = (strings: TemplateStringsArray, values: unknown[]): HTMLResult => {
  const compiled = getStaticTemplate(strings);
  const fragment = compiled.element.content.cloneNode(true) as DocumentFragment;
  const bindings: Binding[] = [];
  // For static HTMLResult embeds: chain their apply calls
  const chainedApplies: Array<(rc: (fn: () => void) => void) => void> = [];

  // Phase 1: Resolve all binding targets BEFORE any DOM modifications
  type BoundSlot = { comment?: Comment; el?: HTMLElement; slot: (typeof compiled.slots)[number]; value: unknown };

  const boundSlots: BoundSlot[] = compiled.slots.map((slot, i) => {
    const value = values[i];

    if (slot.kind === 'closeTag') {
      return { slot, value };
    }

    if (slot.kind === 'node') {
      const comment = followPath(fragment, compiled.commentPaths.get(slot.commentId!)!) as Comment;

      return { comment, slot, value };
    }

    const el = followPath(fragment, compiled.elementPaths.get(slot.elementId!)!) as HTMLElement;

    return { el, slot, value };
  });

  // Phase 2a: Process tagname slots first — replace placeholders with real elements
  const tagReplacements = new Map<HTMLElement, HTMLElement>();

  for (const { el, slot, value } of boundSlots) {
    if (slot.kind !== 'tagname') continue;

    const tagName = String(value);

    if (!/^[a-z][a-z0-9._-]*$/i.test(tagName)) {
      warn(`html\`...\`: dynamic tag name "${tagName}" is not a valid HTML element name — skipping slot replacement.`);

      continue;
    }

    const realEl = document.createElement(tagName);

    for (const attr of Array.from(el!.attributes)) realEl.setAttribute(attr.name, attr.value);

    while (el!.firstChild) realEl.appendChild(el!.firstChild);

    el!.replaceWith(realEl);
    tagReplacements.set(el!, realEl);
  }

  // Phase 2b: Build bindings (may modify DOM for static content)
  for (const { comment, el: rawEl, slot, value } of boundSlots) {
    if (slot.kind === 'tagname' || slot.kind === 'closeTag') continue;

    // Resolve element through tagname replacements
    const el = rawEl ? (tagReplacements.get(rawEl) ?? rawEl) : rawEl;

    if (slot.kind === 'node') {
      const anchor = comment!;

      if (isDirectiveResult(value)) {
        bindings.push({ anchor, directive: value, type: 'directive' });
        continue;
      }

      if (isHtmlResult(value)) {
        // Static embed: move fragment children into place, chain apply
        const parent = anchor.parentNode!;

        while (value.fragment.firstChild) parent.insertBefore(value.fragment.firstChild, anchor);

        anchor.remove();
        chainedApplies.push(value.apply.bind(value));
        continue;
      }

      if (typeof value === 'function') {
        const sig = computed(() => {
          const res = (value as () => unknown)();

          return Array.isArray(res) ? (res as HtmlBindingValue[]) : [res as HtmlBindingValue];
        });

        bindings.push({ anchor, signal: sig, type: 'html' });
        continue;
      }

      if (isReactive(value)) {
        // Always use the html binding for signals — it handles both text values and
        // HTMLResult values, preventing silent "[object Object]" corruption when a
        // signal's runtime type changes from null/string to HTMLResult.
        const sig = computed(() => {
          const raw = (value as Readable<HtmlBindingValue | HtmlBindingValue[]>).value;

          return Array.isArray(raw) ? (raw as HtmlBindingValue[]) : [raw as HtmlBindingValue];
        });

        bindings.push({ anchor, signal: sig, type: 'html' });
        continue;
      }

      if (Array.isArray(value)) {
        const parent = anchor.parentNode!;

        for (const item of value) {
          if (isHtmlResult(item)) {
            while (item.fragment.firstChild) parent.insertBefore(item.fragment.firstChild, anchor);

            chainedApplies.push(item.apply.bind(item));
          } else {
            parent.insertBefore(document.createTextNode(resolveStaticText(item)), anchor);
          }
        }
        anchor.remove();
        continue;
      }

      // Static primitive: replace with text node, no binding
      anchor.replaceWith(document.createTextNode(resolveStaticText(value)));
      continue;
    }

    // Element slot
    const target = el!;

    if (slot.kind === 'event') {
      if (typeof value === 'function') {
        const { handler, options } = applyModifiers(value as (e: Event) => void, slot.modifiers ?? []);

        bindings.push({ el: target, handler, name: slot.name!, options, type: 'event' });
      } else if (isReactive(value)) {
        const signalValue = value as Readable<unknown>;
        const handler = (e: Event) => {
          const h = signalValue.value;

          if (typeof h === 'function') (h as (e: Event) => void)(e);
        };
        const { handler: wrapped, options } = applyModifiers(handler, slot.modifiers ?? []);

        bindings.push({ el: target, handler: wrapped, name: slot.name!, options, type: 'event' });
      }

      continue;
    }

    if (slot.kind === 'ref') {
      if (value) {
        bindings.push({ el: target, ref: value as Ref<Element> | RefCallback<Element>, type: 'ref' });
      }

      continue;
    }

    if (slot.kind === 'spread') {
      if (isSpreadObject(value)) {
        bindings.push({ el: target, spread: value, type: 'spread' });
      }

      continue;
    }

    // attr / boolAttr
    bindings.push(createAttrBindingFromValue(target, slot.mode ?? 'attr', slot.name!, value));
  }

  return createHtmlResult(fragment, (registerCleanup) => {
    for (const binding of bindings) applyBinding(binding, registerCleanup);
    for (const chainedApply of chainedApplies) chainedApply(registerCleanup);
  });
};

export const html = (strings: TemplateStringsArray, ...values: unknown[]): HTMLResult =>
  compileTemplate(strings, values);
