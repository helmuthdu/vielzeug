/**
 * jsdom implements none of the Popover API (`jsdom#3721`): no `showPopover`/`hidePopover`/
 * `togglePopover`, no `popover` IDL attribute, and — the part that silently breaks suites — its
 * selector engine treats `:popover-open` as a documented no-op that never matches.
 *
 * A partial shim (just setting the `popover-open` attribute) is worse than no shim, because every
 * component in the repo guards its calls the idiomatic way:
 *
 * ```ts
 * if (!panel.matches(':popover-open')) panel.showPopover();
 * if (panel.matches(':popover-open')) panel.hidePopover();
 * ```
 *
 * With `:popover-open` permanently false, `showPopover` runs twice and `hidePopover` never runs at
 * all: overlays open and can never close, and the failure looks like a component bug rather than an
 * environment gap. jsdom's UA stylesheet also keeps every `[popover]` element at
 * `display: none` (nothing matches `:popover-open` to lift it), and jsdom's focus algorithm refuses
 * to focus anything with a `display: none` flat-tree ancestor — so focusing an item inside an open
 * panel silently does nothing.
 *
 * This shim closes all three gaps: it tracks open state in the `popover-open` attribute (the same
 * attribute real browsers reflect, so tests can still assert on it), makes `matches(':popover-open')`
 * answer from that state, and holds the element visible with an inline `display` while open —
 * inline styles are the only author-level declaration that beats jsdom's UA rule, since component
 * styles live in adopted style sheets that jsdom does not cascade at all.
 *
 * Known simplifications, deliberate because nothing in the repo depends on them: no light-dismiss
 * behavior (`manual` is the only mode any component uses, and it has none), no top-layer ordering,
 * and no `beforetoggle`/`toggle` events. A suite that starts listening for those needs them added
 * here, not worked around per test.
 *
 * Call this from a test setup when the suite mounts popover-based components: the patches are global
 * monkey-patches, so suites without them shouldn't pay for them. Returns an `uninstall()` restoring
 * every patched global.
 *
 * Lives in Assay because the gap is in jsdom, not in any package's feature, and Assay is the repo's
 * home for DOM test-environment helpers (see `installFormInternalsPolyfill`). Consumer packages get
 * it from here instead of keeping per-file copies that drift out of sync with the API.
 */
export const installPopoverPolyfill = (): (() => void) => {
  if (typeof HTMLElement === 'undefined') return () => {};

  const INSTALLED_FLAG = Symbol.for('vielzeug.assay.popoverPolyfillInstalled');
  const flagHost = globalThis as Record<symbol, boolean | undefined>;

  if (flagHost[INSTALLED_FLAG]) return () => {};

  flagHost[INSTALLED_FLAG] = true;

  // Every patch pushes its inverse here, so uninstall() restores the environment exactly.
  const restorers: Array<() => void> = [];

  const OPEN_ATTRIBUTE = 'popover-open';

  const isOpen = (element: HTMLElement): boolean => element.hasAttribute(OPEN_ATTRIBUTE);

  // The inline `display` each element had before it was first shown, so hiding restores exactly
  // what was there rather than guessing. WeakMap: nothing outlives the element.
  const displayBeforeOpen = new WeakMap<HTMLElement, string>();

  const reveal = (element: HTMLElement): void => {
    const view = element.ownerDocument?.defaultView;

    // Only lift a `display: none` that is actually blocking the element. Overwriting an author-chosen
    // display (`grid` on a menu panel, `flex` on a card) would change layout the test is measuring.
    if (!view || view.getComputedStyle(element).display !== 'none') return;

    if (!displayBeforeOpen.has(element)) {
      displayBeforeOpen.set(element, element.style.getPropertyValue('display'));
    }

    element.style.setProperty('display', 'block');
  };

  const conceal = (element: HTMLElement): void => {
    if (!displayBeforeOpen.has(element)) return;

    const before = displayBeforeOpen.get(element) as string;

    displayBeforeOpen.delete(element);

    if (before) element.style.setProperty('display', before);
    else element.style.removeProperty('display');
  };

  const requirePopoverAttribute = (element: HTMLElement, method: string): void => {
    if (element.hasAttribute('popover')) return;

    // Matches the platform contract: showing or hiding an element that is not a popover is a
    // misuse bug, and throwing here surfaces it instead of letting the test pass quietly.
    throw new DOMException(
      `Failed to execute '${method}' on 'HTMLElement': the element does not have a popover attribute.`,
      'InvalidStateError',
    );
  };

  // Same shape as `installFormInternalsPolyfill`: the prototype is patched through a plain record,
  // because these members are declared as always-present in lib.dom and this file's whole job is to
  // add them where they are absent.
  const proto = HTMLElement.prototype as unknown as Record<string, unknown>;

  const patchProto = (name: string, descriptor: PropertyDescriptor): void => {
    if (name in proto) return;

    Object.defineProperty(proto, name, descriptor);
    restorers.push(() => delete proto[name]);
  };

  patchProto('showPopover', {
    configurable: true,
    value: function (this: HTMLElement, options?: { source?: HTMLElement | null; force?: boolean }) {
      requirePopoverAttribute(this, 'showPopover');

      if (isOpen(this) && !options?.force) return;

      reveal(this);
      this.setAttribute(OPEN_ATTRIBUTE, '');
    },
  });

  patchProto('hidePopover', {
    configurable: true,
    value: function (this: HTMLElement) {
      requirePopoverAttribute(this, 'hidePopover');

      if (!isOpen(this)) return;

      this.removeAttribute(OPEN_ATTRIBUTE);
      conceal(this);
    },
  });

  patchProto('togglePopover', {
    configurable: true,
    value: function (this: HTMLElement, force?: boolean): boolean {
      requirePopoverAttribute(this, 'togglePopover');

      const shouldOpen = force ?? !isOpen(this);

      if (shouldOpen) reveal(this);
      else conceal(this);

      if (shouldOpen) this.setAttribute(OPEN_ATTRIBUTE, '');
      else this.removeAttribute(OPEN_ATTRIBUTE);

      return isOpen(this);
    },
  });

  // The guard every component wraps its calls in. dom-selector (jsdom's engine) stubs `:popover-open`
  // out as a permanent false, so without this `hidePopover` is unreachable from component code.
  // Intercepted by exact selector string: anything else, including `:not(:popover-open)` inside a
  // stylesheet, still goes through jsdom's own engine untouched.
  const originalMatches = Element.prototype.matches;

  Element.prototype.matches = function (this: Element, selectors: string): boolean {
    if (selectors === ':popover-open') return this.hasAttribute(OPEN_ATTRIBUTE);

    return originalMatches.call(this, selectors);
    // Cast: the interception only ever answers for one exact selector string, but the declared
    // member carries element-tag type predicates that a plain predicate cannot structurally satisfy.
  } as unknown as typeof Element.prototype.matches;
  restorers.push(() => {
    Element.prototype.matches = originalMatches;
  });

  return () => {
    for (const restore of restorers) restore();

    restorers.length = 0;
    flagHost[INSTALLED_FLAG] = false;
  };
};
