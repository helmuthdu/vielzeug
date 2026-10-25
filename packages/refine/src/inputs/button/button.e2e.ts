/**
 * Real-browser tests for `ore-button`: a11y checks and CSS layout regressions that jsdom
 * can't evaluate (no CSS box model, `@layer` blocks silently dropped). Complements
 * `button.test.ts`'s jsdom coverage.
 *
 * Run with: pnpm test:e2e (requires built dist: run pnpm build first)
 */
import { axeCheck, expect, test } from '../../testing/fixtures';

test.describe('Accessibility', () => {
  test('default button passes all wcag2a/aa checks', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-button>Click me</ore-button>');

    const results = await axeCheck(page);

    expect(results.violations).toEqual([]);
  });

  test('disabled button passes a11y checks', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-button disabled>Save</ore-button>');

    const results = await axeCheck(page);

    expect(results.violations).toEqual([]);
  });

  test('icon-only button with label passes a11y checks', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-button label="Close dialog" icon="x"></ore-button>');

    const results = await axeCheck(page);

    expect(results.violations).toEqual([]);
  });

  test('link button exposes one accessible link', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-button href="/docs">Documentation</ore-button>');

    const results = await axeCheck(page);

    expect(results.violations).toEqual([]);
    await expect(page.getByRole('link', { name: 'Documentation' })).toHaveCount(1);
  });
});

test.describe('Layout', () => {
  test('horizontal padding is at least 2x vertical padding (2:1 ratio)', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-button id="btn">Save</ore-button>');
    await page.waitForSelector('ore-button');

    const { paddingX, paddingY } = await page.evaluate(() => {
      const el = document.getElementById('btn') as HTMLElement & { shadowRoot: ShadowRoot };
      const btn = el.shadowRoot.querySelector('[part="button"]') as HTMLElement;
      const styles = getComputedStyle(btn);

      return {
        paddingX: parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight),
        paddingY: parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom),
      };
    });

    // paddingX >= paddingY (2:1 design rule uses per-side, total should be >= 2x total Y)
    expect(paddingX).toBeGreaterThanOrEqual(paddingY);
  });

  test('keeps its padding inside a padding="none" ancestor card', async ({ page, refinePage }) => {
    // `ore-card[padding='none']` sets `--_padding: 0` on its host. Custom properties
    // inherit through the light DOM, and the button's md size tier never declared
    // `--_padding` on its own host, so the card's zero leaked into the button's
    // `var(--_padding, ...)` fallback and collapsed its padding (forge drawer footer).
    await refinePage.mountComponent('<ore-card padding="none"><ore-button id="btn">Apply</ore-button></ore-card>');
    await page.waitForSelector('ore-button');

    const padding = await page.evaluate(() => {
      const el = document.getElementById('btn') as HTMLElement & { shadowRoot: ShadowRoot };
      const btn = el.shadowRoot.querySelector('[part="button"]') as HTMLElement;
      const styles = getComputedStyle(btn);

      return {
        block: parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom),
        inline: parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight),
      };
    });

    expect(padding.inline).toBeGreaterThan(0);
    expect(padding.block).toBeGreaterThan(0);
  });

  test('link buttons suppress native anchor underlines', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-button id="link" href="/docs">Documentation</ore-button>');

    const textDecorationLine = await page.evaluate(() => {
      const button = document.getElementById('link')!;
      const link = button.shadowRoot?.querySelector<HTMLAnchorElement>('a[part="button"]')!;

      return getComputedStyle(link).textDecorationLine;
    });

    expect(textDecorationLine).toBe('none');
  });
});

test.describe('Depth', () => {
  /** Reads a computed property off the visible part element. */
  const partStyle = (page: Parameters<typeof axeCheck>[0], id: string, prop: 'boxShadow' | 'backgroundColor') =>
    page.evaluate(
      ({ target, property }) => {
        const el = document.getElementById(target) as HTMLElement & { shadowRoot: ShadowRoot };

        return getComputedStyle(el.shadowRoot.querySelector('[part="button"]')!)[
          property as 'boxShadow' | 'backgroundColor'
        ];
      },
      { property: prop, target: id },
    );

  /**
   * A shadow list that renders nothing.
   *
   * Composed lists carry several placeholders at once (`--_resting-shadow` plus
   * `--_focus-shadow`, sometimes an inset too), so every layer has to be transparent
   * rather than just the first. Colours come back from Chromium in whichever form the
   * token used — `rgba(0, 0, 0, 0)`, `oklab(0 0 0 / 0)`, `oklch(... / 0)` — and
   * `--shadow-none` (`0 0 transparent`) computes to a zero-length rgba layer, never the
   * keyword `none`.
   */
  const isVisuallyFlat = (shadow: string) => {
    const layer =
      '(?:rgba\\(0, 0, 0, 0\\)|oklab\\(0 0 0 / 0\\)|oklch\\([^)]* / 0\\)|transparent) [\\d.-]+px [\\d.-]+px(?: [\\d.-]+px(?: [\\d.-]+px)?)(?: inset)?';

    return shadow.trim() === 'none' || new RegExp(`^${layer}(?:, ${layer})*$`).test(shadow.trim());
  };

  /**
   * Tabs from a known earlier stop until `id` holds focus.
   *
   * `locator.press('Tab')` is unusable here: it focuses the locator and *then* tabs, so
   * focus lands on the next stop and the button under test is left unfocused — the ring
   * assertion would read a resting button and fail for the wrong reason.
   *
   * Reduced motion matters just as much: `box-shadow` is transitioned, so a read taken
   * immediately after focus returns an interpolated value that is still transparent,
   * which looks exactly like a missing ring. theme.css's reduced-motion block sets
   * `--_motion-transition: none`, which every button transition honours.
   */
  const focusByTab = async (page: Parameters<typeof axeCheck>[0], id: string) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.locator('#tab-start').focus();

    for (let step = 0; step < 8; step++) {
      const focused = await page.evaluate((target) => document.activeElement?.id === target, id);

      if (focused) return;
      await page.keyboard.press('Tab');
    }

    throw new Error(`Never reached focus on #${id}`);
  };

  /**
   * The themed focus ring: a 4px spread shadow with no offset. Matched in Chromium's
   * computed form (`0px 0px 0px 4px`), which is what `getComputedStyle` returns for the
   * authored `0 0 0 4px`.
   */
  const RING = /0px 0px 0px 4px/;

  test('is flat at rest by default and elevated on request', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-button id="plain">Plain</ore-button><ore-button id="lifted" elevation="2">Lifted</ore-button>',
    );
    await page.waitForSelector('ore-button');

    // Flat at rest is the deliberate default: depth is a hierarchy signal, so it
    // has to be opt-in or a dense toolbar of glowing buttons signals nothing.
    // The default is the transparent `--shadow-none` placeholder (a bare `none`
    // would invalidate the composed lists), so assert "renders nothing" rather
    // than the keyword.
    expect(isVisuallyFlat(await partStyle(page, 'plain', 'boxShadow'))).toBe(true);
    expect(isVisuallyFlat(await partStyle(page, 'lifted', 'boxShadow'))).toBe(false);
  });

  test('elevation="0" stays flat and keeps the variant bevel valid', async ({ page, refinePage }) => {
    // elevationMixin emits the bare keyword `none` for level 0. Dropped into a
    // composed shadow list that invalidates the whole declaration, so a
    // flat/bordered button at elevation 0 would lose its inset bevel too.
    await refinePage.mountComponent(
      '<ore-button id="zero" elevation="0">Zero</ore-button>' +
        '<ore-button id="flatzero" variant="flat" elevation="0">Flat zero</ore-button>',
    );
    await page.waitForSelector('ore-button');

    expect(isVisuallyFlat(await partStyle(page, 'zero', 'boxShadow'))).toBe(true);
    // `inset` surviving is the proof the list was not invalidated wholesale.
    expect(await partStyle(page, 'flatzero', 'boxShadow')).toContain('inset');
  });

  test('paints the themed focus ring on keyboard focus', async ({ page, refinePage }) => {
    // Button mode keeps focus on the host (`delegatesFocus: false`) and paints its
    // surface with a non-semantic <span>, so a `[part='button']:focus-visible` rule
    // alone can never match: the ring was dead CSS and the host silently fell back to
    // the browser's own outline. The stylesheet also suppresses that outline, so this
    // assertion is what keeps a focused button from having no indicator at all.
    await refinePage.mountComponent('<button id="tab-start">start</button><ore-button id="kb">Save</ore-button>');
    await page.waitForSelector('ore-button');

    await focusByTab(page, 'kb');

    expect(await partStyle(page, 'kb', 'boxShadow')).toMatch(RING);
  });

  test('keeps the focus ring while pressed', async ({ page, refinePage }) => {
    // The press state owns box-shadow, so a press rule that assigns an inset
    // outright erases the focus ring for anyone activating by keyboard
    // (WCAG 2.4.7). Pressing must add depth, never replace what is there.
    //
    // The press rules that matter live in `refine.variants`, which outranks the
    // `refine.overrides` layer that owns the ring, so this has to be exercised with a
    // real press: reading the stylesheet cannot show which layer wins.
    await refinePage.mountComponent(
      '<button id="tab-start">start</button><ore-button id="kb" color="primary" elevation="2">Save</ore-button>',
    );
    await page.waitForSelector('ore-button');

    await focusByTab(page, 'kb');

    const focused = await partStyle(page, 'kb', 'boxShadow');

    expect(focused).toMatch(RING);

    await page.keyboard.down('Space');

    const pressed = await partStyle(page, 'kb', 'boxShadow');

    await page.keyboard.up('Space');

    // Ring and elevation both survive the press.
    expect(pressed).toMatch(RING);
    expect(isVisuallyFlat(pressed)).toBe(false);
  });

  test('keeps the focus ring on an inset-bevel variant while pressed', async ({ page, refinePage }) => {
    // flat/bordered compose their own inset bevel on :active, the exact rules that
    // previously overwrote the ring.
    await refinePage.mountComponent(
      '<button id="tab-start">start</button><ore-button id="bevel" color="primary" variant="flat">Bevel</ore-button>',
    );
    await page.waitForSelector('ore-button');

    await focusByTab(page, 'bevel');

    await page.keyboard.down('Enter');

    const pressed = await partStyle(page, 'bevel', 'boxShadow');

    await page.keyboard.up('Enter');

    expect(pressed).toMatch(RING);
    expect(pressed).toContain('inset');
  });

  test('elevation survives hover on the decoration-free variants', async ({ page, refinePage }) => {
    // ghost/text cancel border and halo decoration, which would otherwise also
    // silently make `elevation` a no-op on them.
    await refinePage.mountComponent('<ore-button id="ghost" variant="ghost" elevation="2">Ghost</ore-button>');
    await page.waitForSelector('ore-button');

    expect(isVisuallyFlat(await partStyle(page, 'ghost', 'boxShadow'))).toBe(false);

    await page.locator('#ghost').hover();

    expect(isVisuallyFlat(await partStyle(page, 'ghost', 'boxShadow'))).toBe(false);
  });

  test('honours the --button-shadow and --button-bg overrides', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-button id="a" elevation="2" style="--button-shadow: 0 30px 0 0 rgb(1 2 3)">A</ore-button>' +
        '<ore-button id="b" style="--button-bg: rgb(9 8 7)">B</ore-button>',
    );
    await page.waitForSelector('ore-button');

    // The documented public hooks must still win over the new defaults.
    expect(await partStyle(page, 'a', 'boxShadow')).toContain('rgb(1, 2, 3)');
    expect(await partStyle(page, 'b', 'backgroundColor')).toContain('rgb(9, 8, 7)');
  });
});
