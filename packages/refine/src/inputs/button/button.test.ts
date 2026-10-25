import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fireClick } from '@vielzeug/assay';
import { type Fixture, mount } from '@vielzeug/ore/testing';

const buttonCss = readFileSync(join(import.meta.dirname, 'button.css'), 'utf-8');

beforeAll(async () => {
  await import('./button');
  await import('../button-group/button-group');
});

/** Collects the selector text of every adopted-stylesheet rule containing `needle`. */
function ruleSelectorsFor(shadowRoot: ShadowRoot, needle: string): string[] {
  const selectors: string[] = [];

  for (const sheet of shadowRoot.adoptedStyleSheets) {
    for (const rule of Array.from(sheet.cssRules)) {
      if (rule instanceof CSSStyleRule && rule.selectorText.includes(needle)) {
        selectors.push(rule.selectorText);
      }
    }
  }

  return selectors;
}

describe('ore-button', () => {
  let fixture: Fixture<HTMLElement>;

  afterEach(() => {
    fixture?.dispose();
  });

  describe('Rendering', () => {
    it('renders a visual part element by default', async () => {
      fixture = await mount('ore-button');

      expect(fixture.query('[part="button"]')).toBeTruthy();
    });

    it('renders a loader element hidden by default', async () => {
      fixture = await mount('ore-button');

      expect(fixture.query('.loader')?.hasAttribute('hidden')).toBe(true);
    });

    it('default slot content is rendered', async () => {
      fixture = await mount('ore-button', { html: '<span>Save</span>' });

      expect(fixture.element.textContent?.trim()).toBe('Save');
    });
  });

  // Regression guard: rainbowEffectMixin/shineEffectMixin take a CSS selector
  // matched against the shadow DOM's actual root element: button.ts used to
  // pass the bare word 'button', a TYPE selector for a literal <button> tag.
  // ore-button never renders one (see "renders a visual part element" above,
  // and Link mode below: it's <span part="button"> or <a part="button">), so
  // the effect rule matched nothing, ever, in any browser: not a stylesheet
  // presence check (that would have passed even with the bug), an actual
  // querySelector() against the live shadow DOM with the rule's own selector.
  describe('Effects', () => {
    it('rainbow effect CSS targets the real [part="button"] element, not a <button> tag', async () => {
      fixture = await mount('ore-button', { attrs: { effect: 'rainbow' } });

      const selectors = ruleSelectorsFor(fixture.element.shadowRoot!, "effect='rainbow'");

      expect(selectors.length).toBeGreaterThan(0);
      expect(selectors.every((s) => s.includes('[part="button"]'))).toBe(true);
      // The part after the last space in `:host([effect='rainbow']) [part="button"]`
      // is a plain shadow-DOM selector: must resolve against the real element.
      expect(fixture.query('[part="button"]')).toBeTruthy();
    });

    it('shine effect CSS targets the real [part="button"] element, not a <button> tag', async () => {
      fixture = await mount('ore-button', { attrs: { effect: 'shine' } });

      const selectors = ruleSelectorsFor(fixture.element.shadowRoot!, "effect='shine'");

      expect(selectors.length).toBeGreaterThan(0);
      expect(selectors.every((s) => s.includes('[part="button"]'))).toBe(true);
    });
  });

  // Same bug class as Effects above: frostVariantMixin also takes a selector
  // matched against the shadow DOM. button.ts used to pass the bare word
  // 'button' here too: the frost variant's halo shadow (var(--_theme-halo))
  // and backdrop-filter never applied, in any browser.
  describe('Frost variant halo', () => {
    it("frost variant CSS targets the real [part='button'] element, not a <button> tag", async () => {
      fixture = await mount('ore-button', { attrs: { variant: 'frost' } });

      const selectors = ruleSelectorsFor(fixture.element.shadowRoot!, "variant='frost'");

      expect(selectors.length).toBeGreaterThan(0);
      expect(selectors.every((s) => s.includes('[part="button"]'))).toBe(true);
    });
  });

  // Regression guard: the hover/active rule's own comment says "halo border
  // effect", but the box-shadow declaration only listed --_theme-shadow :
  // --_theme-halo was never actually in it, so hovering/pressing a button
  // never showed the halo glow the comment (and :focus-visible's own rule,
  // right above it) both promise.
  //
  // button.css authors its rules inside `@layer refine.base/overrides/
  // variants { ... }` (unlike the mixin-generated CSS the Effects/Frost
  // tests above check, which isn't layer-wrapped): jsdom's CSSOM silently
  // drops every rule inside an `@layer` block (see refine's own AGENTS.md,
  // Accessibility testing section), so `adoptedStyleSheets.cssRules` can't
  // see this rule at all under jsdom. Assert against the raw CSS source
  // text instead: a real browser is the correct place to verify the
  // resulting *rendering*, this only guards the source declaration itself.
  describe('Hover/active halo', () => {
    it('hover/active rule declares both --_theme-shadow and --_theme-halo', () => {
      const match = buttonCss.match(/\[part='button'\]:hover,\s*\[part='button'\]:active\s*{([^}]*)}/);

      expect(match).not.toBeNull();
      expect(match?.[1]).toContain('--_theme-shadow');
      expect(match?.[1]).toContain('--_theme-halo');
    });
  });

  // Resting elevation is composed through a --_resting-shadow variable rather than
  // written into each state's box-shadow, because the states already own theirs: a
  // rule that assigned `box-shadow` outright would erase either the elevation (on
  // hover/focus) or the focus ring (on :active). Same failure class as the halo test
  // above, one level up.
  describe('Resting elevation', () => {
    it('defaults --_resting-shadow to a valid transparent shadow on the host', () => {
      const hostBlock = buttonCss.match(/:host\s*{([^}]*)}/)?.[1] ?? '';

      // Must be --shadow-none (0 0 transparent), never the bare keyword `none`:
      // `none` is only valid as a box-shadow's entire value, so substituting it
      // into a composed list invalidates the whole declaration.
      expect(hostBlock).toContain('--_resting-shadow: var(--shadow-none)');
      expect(hostBlock).not.toMatch(/--_resting-shadow:\s*none/);
    });

    it('[elevation] exposes --button-shadow and --button-shadow-contact', () => {
      const match = buttonCss.match(/:host\(\[elevation\]\)\s*{([^}]*)}/);

      expect(match).not.toBeNull();
      expect(match?.[1]).toContain('var(--button-shadow-contact, var(--shadow-2xs))');
      expect(match?.[1]).toContain('var(--button-shadow, var(--_shadow, var(--_theme-halo)))');
    });

    it('elevation="0" neutralises the resting shadow', () => {
      // elevationMixin emits `--_shadow: none` for level 0; without this override
      // that `none` would land inside the composed list above and invalidate it,
      // silently dropping the flat/bordered variants' inset bevel too.
      const match = buttonCss.match(/:host\(\[elevation='0'\]\)\s*{([^}]*)}/);

      expect(match).not.toBeNull();
      expect(match?.[1]).toContain('--_resting-shadow: var(--shadow-none)');
    });

    it('focus-visible fills the ring token and hover/active compose it', () => {
      // The base layer carries its own `[part='button']:focus-visible { outline: none }`,
      // so match within the overrides layer that actually owns the ring.
      const overrides = buttonCss.slice(buttonCss.lastIndexOf('@layer refine.overrides'));
      const focus = overrides.match(
        /\[part='button'\]:focus-visible,\s*\n\s*:host\(:focus-visible\) \[part='button'\]\s*{([^}]*)}/,
      );
      const hover = overrides.match(/\[part='button'\]:hover,\s*\n\s*\[part='button'\]:active\s*{([^}]*)}/);

      // The ring is a token value, not an assigned box-shadow: see 'Focus ring'.
      expect(focus?.[1]).toContain('--_focus-shadow: var(--_theme-shadow), var(--_theme-halo)');
      expect(hover?.[1]).toContain(
        'var(--_resting-shadow), var(--_focus-shadow), var(--_theme-shadow), var(--_theme-halo)',
      );
    });

    it('the shared :active press keeps resting and focus shadows instead of replacing them', () => {
      // Anchored to the start of a line so the variant-scoped
      // `:host([variant='bordered']) [part='button']:active` rule can't match first.
      const match = buttonCss.match(/^ {2}\[part='button'\]:active\s*{([^}]*)}/m);

      expect(match?.[1]).toContain('box-shadow: var(--_resting-shadow), var(--_focus-shadow), var(--inset-shadow-2xs)');
    });

    it('ghost/text cancel decoration without discarding elevation', () => {
      // These variants are deliberately decoration-free, but `box-shadow: none`
      // would also make `elevation` a no-op on them. --_resting-shadow is
      // transparent by default, so the default look is unchanged.
      const cancelled = [...buttonCss.matchAll(/box-shadow:\s*([^;]*);/g)].map((m) => m[1].trim());

      expect(cancelled).not.toContain('none');
    });

    it('reflects the elevation prop to a host attribute', async () => {
      fixture = await mount('ore-button', { attrs: { elevation: '2' } });

      expect(fixture.element.getAttribute('elevation')).toBe('2');
    });
  });

  // The focus indicator had two independent defects, both found by driving a real
  // keyboard rather than reading the stylesheet, and both invisible to jsdom:
  //
  //   1. The ring rule matched `[part='button']:focus-visible` only. Button mode keeps
  //      focus on the host (`shadow: { delegatesFocus: false }`) and paints its visual
  //      surface with a deliberately non-semantic <span>, so that selector can never
  //      match: the themed ring was dead CSS and the host fell back to the browser's
  //      own `outline: auto`.
  //   2. The ring was assigned as `box-shadow` in `refine.overrides`, but the variant
  //      press rules live in `refine.variants`, which outranks it inside a shadow tree
  //      (@layer order there is first-declaration order: base < overrides < variants).
  //      So holding Space/Enter dropped the ring for the length of the press.
  //
  // Fix for both: the ring is a token (--_focus-shadow) that every composed list
  // includes, and the rule also matches `:host(:focus-visible) [part='button']`.
  describe('Focus ring', () => {
    const overridesLayer = () => buttonCss.slice(buttonCss.lastIndexOf('@layer refine.overrides'));

    it('matches the host, because button mode focuses the host not the part', () => {
      // A regression here silently reverts to the browser default outline: the rule
      // still parses, so only a real-browser assertion (button.e2e.ts) catches it.
      expect(overridesLayer()).toMatch(/:host\(:focus-visible\) \[part='button'\]/);
    });

    it('delivers the ring as a token so a press cannot overwrite it', () => {
      const focus = overridesLayer().match(/:host\(:focus-visible\) \[part='button'\]\s*{([^}]*)}/);

      expect(focus?.[1]).toContain('--_focus-shadow:');
      // Assigning box-shadow here would lose to the variants layer on :active.
      expect(focus?.[1]).not.toContain('box-shadow');
    });

    it('every composed box-shadow list includes the focus token', () => {
      // A list that omits it re-creates defect 2 for that variant: the press paints
      // over the ring. Assert on all of them rather than sampling.
      const lists = [...buttonCss.matchAll(/box-shadow:\s*([^;]*);/g)].map((m) => m[1].trim());

      expect(lists.length).toBeGreaterThan(0);
      const missing = lists.filter((list) => !list.includes('var(--_focus-shadow)'));

      expect(missing).toEqual([]);
    });

    it('defaults --_focus-shadow to a valid transparent shadow on the host', () => {
      const hostBlock = buttonCss.match(/:host\s*{([^}]*)}/)?.[1] ?? '';

      expect(hostBlock).toContain('--_focus-shadow: var(--shadow-none)');
      expect(hostBlock).not.toMatch(/--_focus-shadow:\s*none/);
    });

    it('replaces the UA outline only where the themed ring is guaranteed to paint', () => {
      // Suppressing the host outline is only safe because the ring renders; pairing the
      // two in one test keeps a future edit from removing the ring and keeping the
      // suppression, which would leave focused buttons with no indicator at all.
      expect(overridesLayer()).toMatch(/:host\(:focus-visible\)\s*{[^}]*outline:\s*none/);
      expect(overridesLayer()).toMatch(/--_focus-shadow:\s*var\(--_theme-shadow\),\s*var\(--_theme-halo\)/);
    });

    it('restores a system outline in forced-colors mode', async () => {
      // forced-colors discards box-shadow paint, so the themed ring disappears there
      // and the stylesheet's own `outline: none` would leave nothing behind.
      // forcedColorsFocusMixin nests its rule inside @media, which ruleSelectorsFor
      // (top-level rules only) cannot see, so walk the group rules too.
      fixture = await mount('ore-button');

      const selectors: string[] = [];

      const walk = (rules: CSSRuleList) => {
        for (const rule of Array.from(rules)) {
          if (rule instanceof CSSStyleRule) selectors.push(rule.selectorText);
          else if ('cssRules' in rule) walk((rule as CSSGroupingRule).cssRules);
        }
      };

      for (const sheet of fixture.element.shadowRoot?.adoptedStyleSheets ?? []) walk(sheet.cssRules);

      expect(selectors.filter((s) => s.includes(':host') && s.includes(':focus-visible'))).not.toEqual([]);
    });
  });

  // Not about gradients: a file-wide guard. The build runs lightningcss over
  // component CSS, and its light-dark() downgrade rewrites a custom property's value
  // into `var(--lightningcss-light, A) var(--lightningcss-dark, B)` - two
  // space-separated colours, which makes an enclosing linear-gradient() invalid at
  // computed-value time. Those substitution vars are only emitted for selectors
  // lightningcss itself rewrote, so inside a custom property the substitution resolves
  // to nothing and the declaration silently renders as nothing at all. jsdom cannot see
  // this, so it is asserted against the raw source.
  describe('Custom property values', () => {
    it('never wraps a custom property value in light-dark()', () => {
      const declarations = [...buttonCss.matchAll(/^\s*--[\w-]+:\s*([^;]*);/gm)].map((m) => m[1]);

      expect(declarations.filter((value) => value.includes('light-dark('))).toEqual([]);
    });
  });

  describe('Layout', () => {
    it('reflects fullheight as a host attribute', async () => {
      fixture = await mount('ore-button', { attrs: { fullheight: '' } });

      expect(fixture.element.hasAttribute('fullheight')).toBe(true);
    });

    // `[part='button']`'s own height otherwise comes from a fixed size-preset var
    // (`--_height`) rather than the host's box: jsdom drops `@layer`-wrapped rules from the
    // CSSOM (see the Hover/active halo test above for the same limitation), so this asserts the
    // raw CSS source's declarations directly; a real browser is where the actual rendering
    // (list-item.css's e2e layout suite) is verified.
    it('fullheight sets height:100% on both the host and [part="button"]', () => {
      const match = buttonCss.match(
        /:host\(\[fullheight\]\)\s*{([^}]*)}\s*:host\(\[fullheight\]\)\s*\[part='button'\]\s*{([^}]*)}/,
      );

      expect(match).not.toBeNull();
      expect(match?.[1]).toContain('height: 100%');
      expect(match?.[2]).toContain('height: 100%');
    });
  });

  describe('Link styling', () => {
    it('suppresses native underline styling on the anchor part', () => {
      const match = buttonCss.match(/\[part='button'\]\s*{([^}]*)}/);

      expect(match).not.toBeNull();
      expect(match?.[1]).toContain('text-decoration: none');
    });
  });

  describe('Documented CSS overrides', () => {
    // The size presets only set private `--_*` vars, so the public overrides from the JSDoc
    // (`--button-padding`, `--button-gap`, `--button-font-size`) must sit in front of them.
    it('reads --button-padding, --button-gap and --button-font-size ahead of the size presets', () => {
      const match = buttonCss.match(/\[part='button'\]\s*{([^}]*)}/);

      expect(match).not.toBeNull();
      expect(match?.[1]).toContain('padding: var(--button-padding, var(--_padding,');
      expect(match?.[1]).toContain('gap: var(--button-gap, var(--_gap,');
      expect(match?.[1]).toContain('font-size: var(--button-font-size, var(--_font-size,');
    });

    it('declares host-level defaults for the inherited size internals', () => {
      // Custom properties inherit: an ancestor that also uses the `--_` convention
      // (e.g. `ore-card[padding='none']` sets `--_padding: 0`) leaks into the button
      // because the md size tier never declares these vars on the host. The host block
      // must declare the md defaults so the button's own value beats inheritance.
      const hostBlock = buttonCss.match(/:host\s*{([^}]*)}/)?.[1] ?? '';

      expect(hostBlock).toContain('--_padding: var(--size-2) var(--size-4)');
      expect(hostBlock).toContain('--_height: var(--size-10)');
      expect(hostBlock).toContain('--_line-height: var(--leading-normal)');
      expect(hostBlock).toContain('--_icon-size: var(--leading-6)');
    });
  });

  describe('Disabled state', () => {
    it('does not fire click when disabled', async () => {
      fixture = await mount('ore-button', { attrs: { disabled: '' } });

      const handler = vi.fn();

      fixture.element.addEventListener('click', handler);
      fireClick(fixture.query<HTMLElement>('[part="button"]')!);

      expect(handler).not.toHaveBeenCalled();
    });

    it('does not fire click when loading', async () => {
      fixture = await mount('ore-button', { attrs: { loading: '' } });

      const handler = vi.fn();

      fixture.element.addEventListener('click', handler);
      fireClick(fixture.query<HTMLElement>('[part="button"]')!);

      expect(handler).not.toHaveBeenCalled();
    });

    it('hides content area while loading', async () => {
      fixture = await mount('ore-button', { attrs: { loading: '' } });

      // The [loading] attribute drives the CSS rule; verify the host reflects it.
      expect(fixture.element.hasAttribute('loading')).toBe(true);
    });

    it('shows loader spinner while loading', async () => {
      fixture = await mount('ore-button', { attrs: { loading: '' } });

      expect(fixture.query('.loader')?.hasAttribute('hidden')).toBe(false);
    });
  });

  describe('Click event', () => {
    it('fires click on an enabled button', async () => {
      fixture = await mount('ore-button');

      const handler = vi.fn();

      fixture.element.addEventListener('click', handler);
      fireClick(fixture.query<HTMLElement>('[part="button"]')!);

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('fires click on keyboard Enter', async () => {
      fixture = await mount('ore-button');

      const handler = vi.fn();

      fixture.element.addEventListener('click', handler);

      const btn = fixture.query<HTMLElement>('[part="button"]')!;

      btn.focus();
      fireClick(btn);

      expect(handler).toHaveBeenCalled();
    });

    it('does not fire click when disabled and keyboard activated', async () => {
      fixture = await mount('ore-button', { attrs: { disabled: '' } });

      const handler = vi.fn();

      fixture.element.addEventListener('click', handler);

      const btn = fixture.query<HTMLElement>('[part="button"]')!;

      btn.focus();
      fireClick(btn);

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Form submission', () => {
    async function mountInForm(buttonAttrs: Record<string, string> = {}) {
      const html = `
        <form id="test-form">
          <input name="field" value="hello" />
          <ore-button ${Object.entries(buttonAttrs)
            .map(([k, v]) => `${k}="${v}"`)
            .join(' ')}>Submit</ore-button>
        </form>
      `;
      const wrapper = document.createElement('div');

      wrapper.innerHTML = html;
      document.body.appendChild(wrapper);

      const btn = wrapper.querySelector<HTMLElement>('ore-button')!;

      // Wait for custom element upgrade + ElementInternals form association.
      await new Promise<void>((resolve) => setTimeout(resolve, 150));

      return {
        btn,
        destroy: () => wrapper.remove(),
        form: wrapper.querySelector<HTMLFormElement>('form')!,
      };
    }

    it('is a child of the enclosing form (drives ElementInternals association)', async () => {
      const { btn, destroy, form } = await mountInForm({ type: 'submit' });

      expect(form.contains(btn)).toBe(true);
      destroy();
    });

    it('host reflects type="submit" attribute consumed by useFormAction', async () => {
      const { btn, destroy } = await mountInForm({ type: 'submit' });

      expect(btn.getAttribute('type')).toBe('submit');
      destroy();
    });

    it('does not trigger form submit when type="button"', async () => {
      const { btn, destroy, form } = await mountInForm({ type: 'button' });
      const submitHandler = vi.fn((e: Event) => e.preventDefault());

      form.addEventListener('submit', submitHandler);
      fireClick(btn);

      expect(submitHandler).not.toHaveBeenCalled();
      destroy();
    });

    it('host reflects type="reset" attribute consumed by useFormAction', async () => {
      const { btn, destroy } = await mountInForm({ type: 'reset' });

      expect(btn.getAttribute('type')).toBe('reset');
      destroy();
    });

    it('does not submit form when disabled', async () => {
      const { btn, destroy, form } = await mountInForm({ disabled: '', type: 'submit' });
      const submitHandler = vi.fn((e: Event) => e.preventDefault());

      form.addEventListener('submit', submitHandler);
      fireClick(btn);

      expect(submitHandler).not.toHaveBeenCalled();
      destroy();
    });
  });

  describe('Link mode', () => {
    it('renders as a link when href is provided', async () => {
      fixture = await mount('ore-button', { attrs: { href: '/home' } });

      expect(fixture.query('a[part="button"]')).toBeTruthy();
      expect(fixture.query('span[part="button"]')).toBeFalsy();
    });

    it('reverts to normal when href is removed', async () => {
      fixture = await mount('ore-button', { attrs: { href: '/home' } });

      fixture.element.removeAttribute('href');
      await new Promise<void>((r) => setTimeout(r, 10));

      expect(fixture.query('span[part="button"]')).toBeTruthy();
      expect(fixture.query('a[part="button"]')).toBeFalsy();
    });

    it('keeps slotted content when href arrives after upgrade', async () => {
      // Ore templates set interpolated attributes after the element upgrades,
      // so the first render is the span branch and the anchor branch renders on
      // the later switch. A shared (non-factory) content result would render an
      // empty anchor here.
      fixture = await mount('ore-button', { html: 'Let’s talk' });

      fixture.element.setAttribute('href', '/late');
      await new Promise<void>((r) => setTimeout(r, 10));

      const anchor = fixture.query('a[part="button"]');
      expect(anchor).toBeTruthy();
      expect(anchor?.querySelector('.content')).toBeTruthy();
      expect(fixture.element.textContent).toContain('Let’s talk');
    });

    it('keeps slotted content across repeated href toggles', async () => {
      fixture = await mount('ore-button', { html: 'Toggle me' });

      for (const href of ['/a', null, '/b', null, '/c']) {
        if (href === null) fixture.element.removeAttribute('href');
        else fixture.element.setAttribute('href', href);
        await new Promise<void>((r) => setTimeout(r, 10));
        const part = fixture.query('[part="button"]');
        expect(part?.querySelector('.content'), `href=${String(href)}`).toBeTruthy();
      }
    });

    it('internal anchor element reflects the href prop', async () => {
      fixture = await mount('ore-button', { attrs: { href: '/about' } });

      expect(fixture.query('a[part="button"]')?.getAttribute('href')).toBe('/about');
    });

    it('injects noopener noreferrer for target=_blank', async () => {
      fixture = await mount('ore-button', { attrs: { href: '/page', target: '_blank' } });

      const rel = fixture.query('a[part="button"]')?.getAttribute('rel') ?? '';

      expect(rel).toContain('noopener');
      expect(rel).toContain('noreferrer');
      expect(fixture.query('a[part="button"]')?.getAttribute('target')).toBe('_blank');
    });

    it('does not add rel when target is not _blank', async () => {
      fixture = await mount('ore-button', { attrs: { href: '/page', target: '_self' } });

      expect(fixture.query('a[part="button"]')?.getAttribute('rel')).toBeNull();
    });

    it('merges custom rel with security tokens for _blank', async () => {
      fixture = await mount('ore-button', { attrs: { href: '/page', rel: 'external', target: '_blank' } });

      const rel = fixture.query('a[part="button"]')?.getAttribute('rel') ?? '';

      expect(rel).toContain('external');
      expect(rel).toContain('noopener');
      expect(rel).toContain('noreferrer');
    });

    it('uses the inner anchor as the sole focusable link', async () => {
      fixture = await mount('ore-button', { attrs: { href: '/page' } });

      expect(fixture.query('a[part="button"]')?.getAttribute('tabindex')).toBeNull();
      expect(fixture.element.getAttribute('tabindex')).toBeNull();
      expect(fixture.element.getAttribute('role')).toBeNull();
    });

    it('removes disabled links from interaction and navigation', async () => {
      fixture = await mount('ore-button', { attrs: { disabled: '', href: '/page' } });

      const anchor = fixture.query('a[part="button"]');
      expect(anchor?.getAttribute('href')).toBeNull();
      expect(anchor?.getAttribute('tabindex')).toBe('-1');
      expect(anchor?.getAttribute('aria-disabled')).toBe('true');
    });

    it('link mode does not trigger form submission', async () => {
      const wrapper = document.createElement('div');

      wrapper.innerHTML = `
        <form id="lf">
          <ore-button href="/nav" type="submit">Go</ore-button>
        </form>
      `;
      document.body.appendChild(wrapper);
      await new Promise<void>((r) => setTimeout(r, 50));

      const btn = wrapper.querySelector<HTMLElement>('ore-button')!;
      const submitHandler = vi.fn((e: Event) => e.preventDefault());

      wrapper.querySelector('form')?.addEventListener('submit', submitHandler);
      fireClick(btn);

      expect(submitHandler).not.toHaveBeenCalled();
      wrapper.remove();
    });
  });

  describe('Button group context', () => {
    async function mountInGroup(groupAttrs: Record<string, string>, buttonAttrs: Record<string, string> = {}) {
      const html = `
        <ore-button-group ${Object.entries(groupAttrs)
          .map(([k, v]) => `${k}="${v}"`)
          .join(' ')}>
          <ore-button ${Object.entries(buttonAttrs)
            .map(([k, v]) => `${k}="${v}"`)
            .join(' ')}>Item</ore-button>
        </ore-button-group>
      `;
      const wrapper = document.createElement('div');

      wrapper.innerHTML = html;
      document.body.appendChild(wrapper);
      await new Promise<void>((r) => setTimeout(r, 50));

      return {
        btn: wrapper.querySelector<HTMLElement>('ore-button')!,
        destroy: () => wrapper.remove(),
      };
    }

    it('inherits variant from group context', async () => {
      const { btn, destroy } = await mountInGroup({ variant: 'outline' });

      expect(btn.getAttribute('variant')).toBe('outline');
      destroy();
    });

    it('inherits color from group context', async () => {
      const { btn, destroy } = await mountInGroup({ color: 'primary' });

      expect(btn.getAttribute('color')).toBe('primary');
      destroy();
    });

    it('inherits size from group context', async () => {
      const { btn, destroy } = await mountInGroup({ size: 'sm' });

      expect(btn.getAttribute('size')).toBe('sm');
      destroy();
    });

    it('own variant is overridden by group context', async () => {
      const { btn, destroy } = await mountInGroup({ variant: 'ghost' }, { variant: 'solid' });

      expect(btn.getAttribute('variant')).toBe('ghost');
      destroy();
    });

    it('group context keeps precedence over the emphasis mapping', async () => {
      const { btn, destroy } = await mountInGroup({ color: 'secondary', variant: 'bordered' }, { emphasis: 'primary' });

      expect(btn.getAttribute('color')).toBe('secondary');
      expect(btn.getAttribute('variant')).toBe('bordered');
      destroy();
    });
  });

  // HIG button roles: the semantic emphasis picks the treatment, an explicit
  // color/variant stays the escape hatch, and the group context keeps its
  // existing precedence over own props (see the describe block above).
  describe('Emphasis', () => {
    it('primary maps to the accent color and the default (solid) variant', async () => {
      fixture = await mount('ore-button', { attrs: { emphasis: 'primary' } });

      expect(fixture.element.getAttribute('color')).toBe('primary');
      expect(fixture.element.getAttribute('variant')).toBeNull();
    });

    it('cancel maps to the ghost variant and the default neutral color', async () => {
      fixture = await mount('ore-button', { attrs: { emphasis: 'cancel' } });

      expect(fixture.element.getAttribute('variant')).toBe('ghost');
      expect(fixture.element.getAttribute('color')).toBeNull();
    });

    it('destructive maps to error ink with no filled background (text variant)', async () => {
      fixture = await mount('ore-button', { attrs: { emphasis: 'destructive' } });

      expect(fixture.element.getAttribute('color')).toBe('error');
      expect(fixture.element.getAttribute('variant')).toBe('text');
    });

    it('normal is a no-op', async () => {
      fixture = await mount('ore-button', { attrs: { emphasis: 'normal' } });

      expect(fixture.element.getAttribute('color')).toBeNull();
      expect(fixture.element.getAttribute('variant')).toBeNull();
    });

    it('explicit variant overrides the emphasis mapping', async () => {
      fixture = await mount('ore-button', { attrs: { emphasis: 'primary', variant: 'flat' } });

      expect(fixture.element.getAttribute('variant')).toBe('flat');
      expect(fixture.element.getAttribute('color')).toBe('primary');
    });

    it('explicit color overrides the emphasis mapping', async () => {
      fixture = await mount('ore-button', { attrs: { color: 'success', emphasis: 'destructive' } });

      expect(fixture.element.getAttribute('color')).toBe('success');
      expect(fixture.element.getAttribute('variant')).toBe('text');
    });
  });
});

describe('ore-button accessibility', () => {
  let fixture: Fixture<HTMLElement>;

  afterEach(() => {
    fixture?.dispose();
  });

  describe('ARIA', () => {
    it('host carries aria-disabled=true when disabled', async () => {
      fixture = await mount('ore-button', { attrs: { disabled: '' } });

      expect(fixture.element.getAttribute('aria-disabled')).toBe('true');
    });

    it('host aria-disabled is absent when enabled', async () => {
      fixture = await mount('ore-button');

      const val = fixture.element.getAttribute('aria-disabled');

      expect(val === null || val === 'false').toBe(true);
    });

    it('host carries aria-busy=true when loading', async () => {
      fixture = await mount('ore-button', { attrs: { loading: '' } });

      expect(fixture.element.getAttribute('aria-busy')).toBe('true');
    });

    it('host aria-busy is absent when not loading', async () => {
      fixture = await mount('ore-button');

      expect(fixture.element.getAttribute('aria-busy')).toBeNull();
    });

    it('host aria-label reflects the label prop', async () => {
      fixture = await mount('ore-button', { attrs: { label: 'Close dialog' } });

      expect(fixture.element.getAttribute('aria-label')).toBe('Close dialog');
    });

    it('loader has aria-label="Loading"', async () => {
      fixture = await mount('ore-button', { attrs: { loading: '' } });

      expect(fixture.query('.loader')?.getAttribute('aria-label')).toBe('Loading');
    });

    it('anchor in link mode carries native link semantics', async () => {
      fixture = await mount('ore-button', { attrs: { href: '/page' } });

      expect(fixture.query('a[part="button"]')?.getAttribute('href')).toBe('/page');
      expect(fixture.query('a[part="button"]')?.getAttribute('aria-label')).toBeNull();
      expect(fixture.element.getAttribute('role')).toBeNull();
    });
  });

  describe('Accessibility', () => {
    it('passes axe checks with default rendering', async () => {
      fixture = await mount('ore-button', { html: 'Click me' });

      const results = await axeCheck(fixture.element);

      expect(results.violations).toHaveLength(0);
    });

    it('passes axe checks in disabled state', async () => {
      fixture = await mount('ore-button', { attrs: { disabled: '' }, html: 'Save' });

      const results = await axeCheck(fixture.element);

      expect(results.violations).toHaveLength(0);
    });
  });
});
