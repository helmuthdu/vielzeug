/**
 * template/instantiator.ts — Template instantiation and the `html` tagged literal.
 *
 * Responsibilities:
 * - Clone a compiled static template and wire up live bindings.
 * - Expose `compileTemplate()` and `html` as the public authoring API.
 */

import { computed, isReactive, type Readable } from '@vielzeug/ripple';

import { invariant, ORE_ERRORS, OreApiError } from '../errors';
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
import { followPath, getStaticTemplate, SlotKind } from './compiler';

// ─── Template instantiation ──────────────────────────────────────────────────

/**
 * Instantiate a compiled template: clone the cached DOM template, navigate
 * to each binding target using pre-recorded paths, and build bindings with
 * direct node references. Returns an HTMLResult whose fragment is ready to insert.
 */
const NODE_SLOT_NO_PARENT_MSG = 'html`...`: node-slot comment anchor has no parent node';

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

    if (slot.kind === SlotKind.CLOSE_TAG) {
      return { slot, value };
    }

    if (slot.kind === SlotKind.NODE) {
      const commentPath = compiled.commentPaths.get(slot.commentId!);

      invariant(commentPath, `compiled template is missing a comment path for node slot ${slot.commentId}`);

      return { comment: followPath(fragment, commentPath) as Comment, slot, value };
    }

    const elementPath = compiled.elementPaths.get(slot.elementId!);

    invariant(elementPath, `compiled template is missing an element path for slot ${slot.elementId}`);

    return { el: followPath(fragment, elementPath) as HTMLElement, slot, value };
  });

  // Phase 2a: Process tagname slots first — replace placeholders with real elements
  const tagReplacements = new Map<HTMLElement, HTMLElement>();

  for (const { el, slot, value } of boundSlots) {
    if (slot.kind !== SlotKind.TAG_NAME) continue;

    const tagName = String(value);

    // Same "fail immediately, every build" treatment as each()'s duplicate-key
    // guard: a malformed dynamic tag name is a programming bug in the template,
    // not a runtime race — degrading to a silently-broken partial render would
    // hide it instead of surfacing it at the call site.
    if (!/^[a-z][a-z0-9._-]*$/i.test(tagName)) {
      throw new OreApiError(ORE_ERRORS.invalidDynamicTagName(tagName));
    }

    const realEl = document.createElement(tagName);

    for (const attr of Array.from(el!.attributes)) realEl.setAttribute(attr.name, attr.value);

    while (el!.firstChild) realEl.appendChild(el!.firstChild);

    el!.replaceWith(realEl);
    tagReplacements.set(el!, realEl);
  }

  // Phase 2b: Build bindings (may modify DOM for static content)
  for (const { comment, el: rawEl, slot, value } of boundSlots) {
    if (slot.kind === SlotKind.TAG_NAME || slot.kind === SlotKind.CLOSE_TAG) continue;

    // Resolve element through tagname replacements
    const el = rawEl ? (tagReplacements.get(rawEl) ?? rawEl) : rawEl;

    if (slot.kind === SlotKind.NODE) {
      const anchor = comment!;

      if (isDirectiveResult(value)) {
        bindings.push({ anchor, directive: value, type: 'directive' });
        continue;
      }

      if (isHtmlResult(value)) {
        // Static embed: move fragment children into place, chain apply
        const parent = anchor.parentNode;

        invariant(parent, NODE_SLOT_NO_PARENT_MSG);

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
        const parent = anchor.parentNode;

        invariant(parent, NODE_SLOT_NO_PARENT_MSG);

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

    if (slot.kind === SlotKind.EVENT) {
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

    if (slot.kind === SlotKind.REF) {
      if (value) {
        bindings.push({ el: target, ref: value as Ref<Element> | RefCallback<Element>, type: 'ref' });
      }

      continue;
    }

    if (slot.kind === SlotKind.SPREAD) {
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
