/**
 * Real-browser accessibility checks for `ore-input`: the `color-contrast`/`target-size` rules
 * jsdom can't compute: plus CSS layout regressions jsdom can't catch either (no real box model,
 * `@layer` blocks silently dropped). Complements `input.test.ts`'s jsdom coverage.
 *
 * Run with: bun run test:e2e (requires built dist: run bun run build first)
 */
import { axeCheck, expect, test } from '../../testing/fixtures';

test.describe('Accessibility', () => {
  test('labeled input passes all wcag2a/aa checks', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-input label="Email address" type="email"></ore-input>');

    const results = await axeCheck(page);

    expect(results.violations).toEqual([]);
  });

  test('required input with error passes a11y checks', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-input label="Username" required invalid error="Username is required"></ore-input>',
    );

    const results = await axeCheck(page);

    expect(results.violations).toEqual([]);
  });

  test('outside label passes dark-mode contrast', async ({ page, refinePage }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await refinePage.mountComponent('<ore-input label="Email address" label-placement="outside"></ore-input>');

    const results = await axeCheck(page);

    expect(results.violations).toEqual([]);
  });
});

test.describe('Layout', () => {
  test('uses the control radius independently of size and variant', async ({ page, refinePage }) => {
    const cases = [
      { attrs: '', radius: '8px' },
      { attrs: 'size="sm" variant="flat"', radius: '8px' },
      { attrs: 'size="lg" variant="frost"', radius: '8px' },
      { attrs: 'variant="text"', radius: '0px' },
      { attrs: 'rounded="xl"', radius: '12px' },
      { attrs: 'rounded="none"', radius: '0px' },
      { attrs: 'rounded="full"', radius: '9999px' },
      { attrs: 'style="--input-radius: var(--rounded-2xl)"', radius: '16px' },
      { attrs: 'style="--radius: var(--rounded-xl)"', radius: '12px' },
      { attrs: 'style="--rounded-xl: 1rem"', radius: '8px' },
    ];

    await refinePage.mountComponent(
      cases.map(({ attrs }, index) => `<ore-input id="shape-${index}" ${attrs} label="Name"></ore-input>`).join(''),
    );

    for (const [index, { radius }] of cases.entries()) {
      await expect(page.locator(`#shape-${index} [part="field"]`)).toHaveCSS('border-radius', radius);
    }
  });

  test('composed fields inherit the input default and retain explicit rounding', async ({ page, refinePage }) => {
    const tags = [
      'ore-select',
      'ore-combobox',
      'ore-number-input',
      'ore-date-picker',
      'ore-time-picker',
      'ore-query-bar',
    ];

    await refinePage.mountComponent(
      tags
        .flatMap((tag) => [
          `<${tag} id="${tag}-default" label="Value"></${tag}>`,
          `<${tag} id="${tag}-explicit" label="Value" rounded="xl"></${tag}>`,
        ])
        .join(''),
    );

    for (const tag of tags) {
      await expect(page.locator(`#${tag}-default ore-input [part="field"]`).first()).toHaveCSS('border-radius', '8px');
      await expect(page.locator(`#${tag}-explicit ore-input [part="field"]`).first()).toHaveCSS(
        'border-radius',
        '12px',
      );
    }
  });

  test('a scoped control radius changes fields and panels without reshaping cards', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<div style="--radius: var(--rounded-xl)">' +
        '<ore-card id="surface">Surface</ore-card>' +
        '<ore-input id="field" label="Name"></ore-input>' +
        '<ore-calendar id="calendar"></ore-calendar>' +
        '<ore-select id="select" label="Choice"></ore-select>' +
        '<ore-date-picker id="date" label="Date"></ore-date-picker>' +
        '<ore-time-picker id="time" label="Time"></ore-time-picker>' +
        '</div>',
    );

    await expect(page.locator('#field [part="field"]')).toHaveCSS('border-radius', '12px');
    await expect(page.locator('#calendar .calendar')).toHaveCSS('border-radius', '12px');
    await expect(page.locator('#select .dropdown')).toHaveCSS('border-radius', '12px');
    await expect(page.locator('#date .calendar')).toHaveCSS('border-radius', '12px');
    await expect(page.locator('#time .dropdown')).toHaveCSS('border-radius', '12px');
    await expect(page.locator('#surface [part="card"]')).toHaveCSS('border-radius', '8px');
  });

  test('honors the documented input color override', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-input label="Stance" value="Stance 1" style="--input-color:rgb(255 255 255);--input-bg:rgb(32 32 32)"></ore-input>',
    );
    const color = await page
      .locator('ore-input')
      .getByRole('textbox', { name: 'Stance' })
      .evaluate((element) => getComputedStyle(element).color);
    expect(color).toBe('rgb(255, 255, 255)');
  });

  // Regression coverage for a real bug: `fieldVariantMixin`'s `@layer refine.variants` rules
  // were silently losing to `componentStyles`'s `@layer refine.base` defaults when the mixin
  // was wired into `styles` *before* `componentStyles`: every variant rendered identically to
  // the unconditional base background, and jsdom can't catch this since it drops `@layer`
  // entirely (see `input.ts`'s `styles` array ordering comment for the actual fix).
  test('each variant renders a visually distinct field background', async ({ page, refinePage }) => {
    const variants = ['solid', 'flat', 'bordered', 'outline', 'ghost', 'text'] as const;

    await refinePage.mountComponent(
      variants.map((variant) => `<ore-input id="${variant}" variant="${variant}" value="x"></ore-input>`).join(''),
    );

    const backgrounds = await page.evaluate((ids) => {
      return ids.map((id) => {
        const el = document.getElementById(id) as HTMLElement & { shadowRoot: ShadowRoot };
        const field = el.shadowRoot.querySelector('.field') as HTMLElement;

        return getComputedStyle(field).backgroundColor;
      });
    }, variants);

    // Not every variant needs a unique background (`outline`/`ghost`/`text` are all legitimately
    // transparent at rest), but they must not *all* collapse to the same value, that's the
    // signature of the base layer winning over every variant rule.
    expect(new Set(backgrounds).size).toBeGreaterThan(1);
  });

  // Regression guard for the bordered redesign: the variant rides the themed backdrop/border
  // pairing (like ore-alert's), but typed text must stay neutral ink — the theme base color
  // on the pale backdrop misses AA contrast and decorates user content.
  test('bordered variant keeps neutral ink text on the themed backdrop', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<span id="ink" style="color: var(--color-contrast-900)"></span>' +
        '<span id="backdrop" style="background-color: var(--color-error-backdrop)"></span>' +
        '<ore-input id="bordered-themed" variant="bordered" color="error" value="typed"></ore-input>',
    );

    const probe = await page.evaluate(() => {
      const field = document
        .querySelector<HTMLElement>('#bordered-themed')!
        .shadowRoot!.querySelector<HTMLElement>('.field')!;
      const color = (el: HTMLElement) => getComputedStyle(el).color;
      const ink = color(document.getElementById('ink')!);
      const backdrop = getComputedStyle(document.getElementById('backdrop')!).backgroundColor;

      return {
        bgIsBackdrop: getComputedStyle(field).backgroundColor === backdrop,
        textNeutral: color(field.querySelector('input')!) === ink,
      };
    });

    expect(probe.textNeutral).toBe(true);
    expect(probe.bgIsBackdrop).toBe(true);
  });

  // Regression coverage for a related bug: the focus/error/success glow (`box-shadow` on
  // `.field:focus-within`) lived in `@layer refine.overrides`, while solid/outline/ghost's
  // rest-state `box-shadow` (`fieldVariantMixin`) lives in `@layer refine.variants`: cascade
  // layers beat specificity outright, so the glow always lost to the plain rest-state shadow,
  // regardless of focus/error/success. `box-shadow` is transitioned, so read after it settles.
  for (const variant of ['solid', 'outline', 'ghost'] as const) {
    test(`${variant} variant shows a focus glow distinct from its rest-state box-shadow`, async ({
      page,
      refinePage,
    }) => {
      await refinePage.mountComponent(`<ore-input id="in" variant="${variant}" value="x"></ore-input>`);

      const rest = await page.evaluate(() => {
        const field = (
          document.getElementById('in') as HTMLElement & { shadowRoot: ShadowRoot }
        ).shadowRoot.querySelector('.field') as HTMLElement;

        return getComputedStyle(field).boxShadow;
      });

      await page.evaluate(() => {
        (document.getElementById('in') as HTMLElement & { shadowRoot: ShadowRoot }).shadowRoot
          .querySelector('input')
          ?.focus();
      });
      await page.waitForTimeout(300);

      const focused = await page.evaluate(() => {
        const field = (
          document.getElementById('in') as HTMLElement & { shadowRoot: ShadowRoot }
        ).shadowRoot.querySelector('.field') as HTMLElement;

        return getComputedStyle(field).boxShadow;
      });

      expect(focused).not.toBe(rest);
    });
  }

  // `fullwidth` means "fill the track": in a track narrower than the 12rem floor the field must
  // follow the track, not overflow it. The same contract holds for every field built on the
  // 12rem floor, so the composites are checked here alongside the primitive.
  for (const tag of ['ore-input', 'ore-select', 'ore-number-input', 'ore-combobox', 'ore-date-picker'] as const) {
    test(`fullwidth ${tag} never exceeds a 120px track`, async ({ page, refinePage }) => {
      await refinePage.mountComponent(
        `<div id="track" style="width:120px"><${tag} id="field" fullwidth label="Narrow"></${tag}></div>`,
      );

      const width = await page.evaluate(() => document.getElementById('field')?.getBoundingClientRect().width);

      expect(width).toBeLessThanOrEqual(120);
    });
  }

  // Regression coverage for a 2px-height bug: the global preflight `*{box-sizing:border-box}` does
  // not cross shadow boundaries, so the inner `<input>` fell back to the UA default: border-box
  // for `input[type=search]` but content-box for a plain input (the `ore-select` trigger), whose
  // 1px vertical padding then added 2px to every select next to a search field.
  test('inner input is border-box so search fields and select triggers match height', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      `<div style="display:grid;grid-template-columns:1fr 1fr">
        <ore-input id="search" type="search" label="Search"></ore-input>
        <ore-select id="pick" label="Pick"><option value="a">A</option></ore-select>
      </div>`,
    );

    const boxSizing = await page.evaluate(() => {
      const input = (
        document.getElementById('search') as HTMLElement & { shadowRoot: ShadowRoot }
      ).shadowRoot.querySelector('input') as HTMLInputElement;

      return getComputedStyle(input).boxSizing;
    });

    expect(boxSizing).toBe('border-box');

    const heights = await page.evaluate(() =>
      ['search', 'pick'].map((id) => document.getElementById(id)?.getBoundingClientRect().height),
    );

    expect(heights[0]).toBe(heights[1]);
  });
});

test.describe('Touch layout', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { height: 844, width: 390 } });

  test('preserves larger public font overrides while flooring smaller overrides', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`
      <ore-input size="sm" label="Input" style="--input-font-size: 24px"></ore-input>
      <ore-textarea size="sm" label="Textarea" style="--textarea-font-size: 24px"></ore-textarea>
      <ore-otp-input size="sm" label="Code" style="--otp-cell-font-size: 24px"></ore-otp-input>
    `);
    for (const selector of ['ore-input input', 'ore-textarea textarea', 'ore-otp-input input.cell']) {
      await expect(page.locator(selector).first()).toHaveCSS('font-size', '24px');
    }
    await page.evaluate(() => {
      for (const [tag, property] of [
        ['ore-input', '--input-font-size'],
        ['ore-textarea', '--textarea-font-size'],
        ['ore-otp-input', '--otp-cell-font-size'],
      ])
        document.querySelector<HTMLElement>(tag)!.style.setProperty(property, '8px');
    });
    for (const selector of ['ore-input input', 'ore-textarea textarea', 'ore-otp-input input.cell']) {
      await expect(page.locator(selector).first()).toHaveCSS('font-size', '16px');
    }
  });

  for (const size of ['sm', 'md', 'lg'] as const) {
    test(`floors native editors at 16 CSS pixels with smaller root and theme text, size=${size}`, async ({
      page,
      refinePage,
    }) => {
      await page.addStyleTag({ content: 'html { font-size: 14px; --text-base: 0.75rem; }' });
      await refinePage.mountComponent(`
      <ore-input label="Input" size="${size}"></ore-input>
      <ore-textarea label="Textarea" size="${size}"></ore-textarea>
      <ore-message-composer label="Message" size="${size}"></ore-message-composer>
      <ore-otp-input label="Code" size="${size}"></ore-otp-input>
      <ore-command-palette label="Commands"></ore-command-palette>
    `);
      const sizes = await page.evaluate(() => {
        const targets = [
          ['ore-input', 'input'],
          ['ore-textarea', 'textarea'],
          ['ore-message-composer', 'textarea'],
          ['ore-otp-input', 'input.cell'],
          ['ore-command-palette', 'input'],
        ];
        return targets.map(([tag, selector]) =>
          Number.parseFloat(
            getComputedStyle(document.querySelector(tag)!.shadowRoot!.querySelector(selector)!).fontSize,
          ),
        );
      });
      for (const size of sizes) expect(size).toBeGreaterThanOrEqual(16);
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '32px';
      });
      await expect(page.locator('ore-input input')).toHaveCSS('font-size', '24px');
      await expect(page.locator('ore-textarea textarea')).toHaveCSS('font-size', '24px');
      await expect(page.locator('ore-message-composer textarea')).toHaveCSS('font-size', '24px');
      await expect(page.locator('ore-otp-input input.cell').first()).toHaveCSS(
        'font-size',
        { lg: '48px', md: '40px', sm: '24px' }[size],
      );
      await expect(page.locator('ore-command-palette input')).toHaveCSS('font-size', '24px');
    });
  }

  test('does not apply pointer-hover decoration on a non-hover device', async ({ page, refinePage }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await refinePage.mountComponent('<ore-input label="Name"></ore-input>');
    const field = page.locator('ore-input .field');
    const resting = await field.evaluate((element) => getComputedStyle(element).borderTopColor);
    await field.hover();
    expect(await field.evaluate((element) => element.matches(':hover'))).toBe(true);
    await expect(field).toHaveCSS('border-top-color', resting);
    await page.locator('ore-input input').focus();
    await expect.poll(() => field.evaluate((element) => getComputedStyle(element).borderTopColor)).not.toBe(resting);
  });

  // iOS Safari zooms the whole page when a focused text control's computed font-size is
  // below 16 px (SC 1.4.4), so under a coarse pointer every size must render at the 16 px
  // floor. Regression coverage for the promotion being dead code: `touchTargetMixin` sat
  // *before* `sizeVariantMixin` in `styles`, and both sheets are unlayered, so the later
  // per-size block overrode the whole `@media (pointer: coarse)` promotion (jsdom drops
  // `@media` cascade effects, so only a real browser catches this).
  for (const size of ['default', 'sm', 'md', 'lg'] as const) {
    test(`${size} keeps the inner input at the 16px iOS zoom floor`, async ({ page, refinePage }) => {
      const attr = size === 'default' ? '' : ` size="${size}"`;
      await refinePage.mountComponent(`<ore-input id="${size}"${attr} label="Email"></ore-input>`);

      const coarse = await page.evaluate(() => matchMedia('(pointer: coarse)').matches);
      expect(coarse).toBe(true);

      const fontSize = await page.evaluate((id) => {
        const el = document.getElementById(id) as HTMLElement & { shadowRoot: ShadowRoot };
        const input = el.shadowRoot.querySelector('input') as HTMLInputElement;

        return parseFloat(getComputedStyle(input).fontSize);
      }, size);

      expect(fontSize).toBeGreaterThanOrEqual(16);
    });
  }
});
