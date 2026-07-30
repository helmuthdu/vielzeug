/**
 * template/instantiator.ts — Template instantiation and the `html` tagged literal.
 *
 * Responsibilities:
 * - Clone a compiled static template and wire up live bindings.
 * - Expose `compileTemplate()` and `html` as the public authoring API.
 */

import { computed, isReactive, type Readable } from '@vielzeug/ripple';

import { warn } from '../_dev';
import { invariant, ORE_ERRORS, OreApiError } from '../errors';
import { applyModifiers } from '../utils/event-modifiers';
import { type Binding, type HtmlBindingValue } from './binding-types';
import { applyBinding, createAttrBindingFromValue, resolveStaticText } from './bindings';
import { followPath, getStaticTemplate, SlotKind } from './compiler';
import {
  type CompiledHTMLResult,
  createHtmlResult,
  type HTMLResult,
  isDirectiveResult,
  isHtmlResult,
  isSpreadObject,
  type Ref,
  type RefCallback,
} from './result';

// ─── Template instantiation ──────────────────────────────────────────────────

const NODE_SLOT_NO_PARENT_MSG = 'html`...`: node-slot comment anchor has no parent node';

/** Normalize a reactive node-slot value to the HtmlBinding signal's array shape. */
const toHtmlValues = (raw: unknown): HtmlBindingValue[] =>
  Array.isArray(raw) ? (raw as HtmlBindingValue[]) : [raw as HtmlBindingValue];

/**
 * Static-embed an already-created HTMLResult at a node-slot anchor: move its
 * fragment children into place and chain its apply into the outer apply phase
 * (so embedded reactive wiring starts when the host template mounts, not now).
 */
const embedStaticResult = (
  result: CompiledHTMLResult,
  anchor: Comment,
  chainedApplies: Array<(rc: (fn: () => void) => void) => void>,
): void => {
  const parent = anchor.parentNode;

  invariant(parent, NODE_SLOT_NO_PARENT_MSG);

  while (result.fragment.firstChild) parent.insertBefore(result.fragment.firstChild, anchor);

  chainedApplies.push(result.apply.bind(result));
};

/**
 * Instantiate a compiled template: clone the cached DOM template, navigate
 * to each binding target using pre-recorded paths, and build bindings with
 * direct node references. Returns an HTMLResult ready to mount.
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

    if (slot.kind === SlotKind.CLOSE_TAG) {
      return { slot, value };
    }

    if (slot.kind === SlotKind.NODE) {
      const commentPath = slot.commentId !== undefined ? compiled.commentPaths.get(slot.commentId) : undefined;

      invariant(commentPath, `compiled template is missing a comment path for node slot ${slot.commentId}`);

      return { comment: followPath(fragment, commentPath) as Comment, slot, value };
    }

    const elementPath = slot.elementId !== undefined ? compiled.elementPaths.get(slot.elementId) : undefined;

    invariant(elementPath, `compiled template is missing an element path for slot ${slot.elementId}`);

    return { el: followPath(fragment, elementPath) as HTMLElement, slot, value };
  });

  // Phase 2a: Process tagname slots first — replace placeholders with real elements
  const tagReplacements = new Map<HTMLElement, HTMLElement>();

  for (const { el, slot, value } of boundSlots) {
    if (slot.kind !== SlotKind.TAG_NAME || !el) continue;

    const tagName = String(value);

    // Throws immediately, every build: a malformed dynamic tag name is a programming bug in
    // the template, not a runtime race, and this happens synchronously during instantiation
    // (not inside a reactive effect) — there's no risk of an uncaught throw here corrupting an
    // unrelated batch of effects the way rethrowing from each()'s reconciliation would (see
    // each.ts's duplicate-key handling, which instead reports via reportRuntimeError() since it
    // runs inside a reactive effect).
    if (!/^[a-z][a-z0-9._-]*$/i.test(tagName)) {
      throw new OreApiError(ORE_ERRORS.invalidDynamicTagName(tagName));
    }

    const realEl = document.createElement(tagName);

    for (const attr of Array.from(el.attributes)) realEl.setAttribute(attr.name, attr.value);

    while (el.firstChild) realEl.appendChild(el.firstChild);

    el.replaceWith(realEl);
    tagReplacements.set(el, realEl);
  }

  // Phase 2b: Build bindings (may modify DOM for static content)
  for (const { comment, el: rawEl, slot, value } of boundSlots) {
    if (slot.kind === SlotKind.TAG_NAME || slot.kind === SlotKind.CLOSE_TAG) continue;

    // Resolve element through tagname replacements
    const el = rawEl ? (tagReplacements.get(rawEl) ?? rawEl) : rawEl;

    if (slot.kind === SlotKind.NODE) {
      const anchor = comment;

      invariant(anchor, 'compiled template produced a node slot without a comment anchor');

      if (isDirectiveResult(value)) {
        bindings.push({ anchor, directive: value, type: 'directive' });
        continue;
      }

      if (isHtmlResult(value)) {
        // Static embed: move fragment children into place, chain apply
        embedStaticResult(value, anchor, chainedApplies);
        anchor.remove();
        continue;
      }

      if (typeof value === 'function' || isReactive(value)) {
        // Always use the html binding for reactive values — it handles both text
        // values and HTMLResult values, preventing silent "[object Object]"
        // corruption when a signal's runtime type changes from null/string to HTMLResult.
        const sig =
          typeof value === 'function'
            ? computed(() => toHtmlValues((value as () => unknown)()))
            : computed(() => toHtmlValues((value as Readable<unknown>).value));

        bindings.push({ anchor, signal: sig, type: 'html' });
        continue;
      }

      if (Array.isArray(value)) {
        for (const item of value) {
          if (isHtmlResult(item)) {
            embedStaticResult(item, anchor, chainedApplies);
          } else {
            const parent = anchor.parentNode;

            invariant(parent, NODE_SLOT_NO_PARENT_MSG);
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
    invariant(el, 'compiled template produced an element slot without an element');

    if (slot.kind === SlotKind.EVENT) {
      const name = slot.name;

      invariant(name, 'compiled template produced an event slot without an event name');

      if (typeof value === 'function') {
        const { handler, options } = applyModifiers(name, value as (e: Event) => void, slot.modifiers ?? []);

        bindings.push({ el, handler, name, options, type: 'event' });
      } else if (isReactive(value)) {
        const signalValue = value as Readable<unknown>;
        const handler = (e: Event) => {
          const h = signalValue.value;

          if (typeof h === 'function') (h as (e: Event) => void)(e);
        };
        const { handler: wrapped, options } = applyModifiers(name, handler, slot.modifiers ?? []);

        bindings.push({ el, handler: wrapped, name, options, type: 'event' });
      }

      continue;
    }

    if (slot.kind === SlotKind.REF) {
      if (value) {
        bindings.push({ el, ref: value as Ref<Element> | RefCallback<Element>, type: 'ref' });
      }

      continue;
    }

    if (slot.kind === SlotKind.SPREAD) {
      if (isSpreadObject(value)) {
        bindings.push({ el, spread: value, type: 'spread' });
      } else {
        // Interpolation landed inside a start tag but isn't a SpreadObject — almost
        // always a typo (e.g. a missing model() call or a stray expression), and it
        // would otherwise vanish silently: no binding, no text, no error.
        warn(
          'html`...`: interpolation inside a tag is only valid for spread objects (e.g. model(signal)). ' +
            `Received ${typeof value} — it was ignored.`,
        );
      }

      continue;
    }

    // attr / boolAttr
    invariant(slot.name, 'compiled template produced an attr slot without an attribute name');
    bindings.push(createAttrBindingFromValue(el, slot.mode ?? 'attr', slot.name, value));
  }

  return createHtmlResult(fragment, (registerCleanup) => {
    for (const binding of bindings) applyBinding(binding, registerCleanup);
    for (const chainedApply of chainedApplies) chainedApply(registerCleanup);
  });
};

export const html = (strings: TemplateStringsArray, ...values: unknown[]): HTMLResult =>
  compileTemplate(strings, values);
