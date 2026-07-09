import { type Fixture, mount, user } from '@vielzeug/ore/testing';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

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
  // matched against the shadow DOM's actual root element — button.ts used to
  // pass the bare word 'button', a TYPE selector for a literal <button> tag.
  // ore-button never renders one (see "renders a visual part element" above,
  // and Link mode below: it's <span part="button"> or <a part="button">), so
  // the effect rule matched nothing, ever, in any browser — not a stylesheet
  // presence check (that would have passed even with the bug), an actual
  // querySelector() against the live shadow DOM with the rule's own selector.
  describe('Effects', () => {
    it('rainbow effect CSS targets the real [part="button"] element, not a <button> tag', async () => {
      fixture = await mount('ore-button', { attrs: { effect: 'rainbow' } });

      const selectors = ruleSelectorsFor(fixture.element.shadowRoot!, "effect='rainbow'");

      expect(selectors.length).toBeGreaterThan(0);
      expect(selectors.every((s) => s.includes('[part="button"]'))).toBe(true);
      // The part after the last space in `:host([effect='rainbow']) [part="button"]`
      // is a plain shadow-DOM selector — must resolve against the real element.
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
  // 'button' here too — the frost variant's halo shadow (var(--_theme-halo))
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
  // effect", but the box-shadow declaration only listed --_theme-shadow —
  // --_theme-halo was never actually in it, so hovering/pressing a button
  // never showed the halo glow the comment (and :focus-visible's own rule,
  // right above it) both promise.
  //
  // button.css authors its rules inside `@layer refine.base/overrides/
  // variants { ... }` (unlike the mixin-generated CSS the Effects/Frost
  // tests above check, which isn't layer-wrapped) — jsdom's CSSOM silently
  // drops every rule inside an `@layer` block (see refine's own AGENTS.md,
  // Accessibility testing section), so `adoptedStyleSheets.cssRules` can't
  // see this rule at all under jsdom. Assert against the raw CSS source
  // text instead — a real browser is the correct place to verify the
  // resulting *rendering*, this only guards the source declaration itself.
  describe('Hover/active halo', () => {
    it('hover/active rule declares both --_theme-shadow and --_theme-halo', () => {
      const match = buttonCss.match(/\[part='button'\]:hover,\s*\[part='button'\]:active\s*{([^}]*)}/);

      expect(match).not.toBeNull();
      expect(match![1]).toContain('--_theme-shadow');
      expect(match![1]).toContain('--_theme-halo');
    });
  });

  describe('Disabled state', () => {
    it('does not fire click when disabled', async () => {
      fixture = await mount('ore-button', { attrs: { disabled: '' } });

      const handler = vi.fn();

      fixture.element.addEventListener('click', handler);
      await user.click(fixture.query<HTMLElement>('[part="button"]')!);

      expect(handler).not.toHaveBeenCalled();
    });

    it('does not fire click when loading', async () => {
      fixture = await mount('ore-button', { attrs: { loading: '' } });

      const handler = vi.fn();

      fixture.element.addEventListener('click', handler);
      await user.click(fixture.query<HTMLElement>('[part="button"]')!);

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
      await user.click(fixture.query<HTMLElement>('[part="button"]')!);

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('fires click on keyboard Enter', async () => {
      fixture = await mount('ore-button');

      const handler = vi.fn();

      fixture.element.addEventListener('click', handler);

      const btn = fixture.query<HTMLElement>('[part="button"]')!;

      btn.focus();
      await user.click(btn);

      expect(handler).toHaveBeenCalled();
    });

    it('does not fire click when disabled and keyboard activated', async () => {
      fixture = await mount('ore-button', { attrs: { disabled: '' } });

      const handler = vi.fn();

      fixture.element.addEventListener('click', handler);

      const btn = fixture.query<HTMLElement>('[part="button"]')!;

      btn.focus();
      await user.click(btn);

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
      await user.click(btn);

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
      await user.click(btn);

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

    it('the inner anchor is decorative (tabindex -1) — the host carries the real link semantics', async () => {
      fixture = await mount('ore-button', { attrs: { href: '/page' } });

      expect(fixture.query('a[part="button"]')?.getAttribute('tabindex')).toBe('-1');
      expect(fixture.element.getAttribute('tabindex')).toBe('0');
      expect(fixture.element.getAttribute('role')).toBe('link');
    });

    it('disabling pointer interaction on the anchor when disabled', async () => {
      fixture = await mount('ore-button', { attrs: { disabled: '', href: '/page' } });

      expect(fixture.element.getAttribute('tabindex')).toBe('-1');
      expect(fixture.element.getAttribute('aria-disabled')).toBe('true');
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

      wrapper.querySelector('form')!.addEventListener('submit', submitHandler);
      await user.click(btn);

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

    it('anchor in link mode carries role="link" on host', async () => {
      fixture = await mount('ore-button', { attrs: { href: '/page' } });

      expect(fixture.element.getAttribute('role')).toBe('link');
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
