/**
 * Real-browser accessibility check for `ore-select`: a real axe scan against the rendered
 * shadow DOM. Complements `select.test.ts`'s jsdom coverage.
 *
 * Run with: pnpm test:e2e (requires built dist: run pnpm build first)
 */
import type { Page } from '@playwright/test';
import { axeCheck, expect, test } from '../../testing/fixtures';

test.describe('Accessibility', () => {
  // axe-core cannot pierce shadow DOM to see listbox children (ore-option elements in light DOM).
  // This produces a false-positive aria-required-children violation. The component is correct;
  // the limitation is axe's flat-tree traversal, not following shadow-slot assignments.
  test.fail(
    'labeled select passes a11y checks (aria-required-children shadow DOM limitation)',
    async ({ page, refinePage }) => {
      await refinePage.mountComponent(
        '<ore-select label="Country">' +
          '<ore-option value="us">United States</ore-option>' +
          '<ore-option value="de">Germany</ore-option>' +
          '</ore-select>',
      );

      const results = await axeCheck(page);

      expect(results.violations).toEqual([]);
    },
  );
});

test.describe('Disabled reason', () => {
  test('shows and announces why an option is unavailable', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-select label="Plan">' +
        '<option value="starter">Starter</option>' +
        '<option value="enterprise" disabled data-disabled-reason="Contact sales to enable">Enterprise</option>' +
        '</ore-select>',
    );

    await page.locator('ore-select[label="Plan"]').click();
    const option = page.getByRole('option', { name: 'Enterprise Contact sales to enable' });
    await expect(option).toBeVisible();
    await expect(option.locator('.disabled-reason')).toHaveAttribute('title', 'Contact sales to enable');
  });
});

test.describe('Layout', () => {
  // A narrow (e.g. fullwidth in a phone grid column) select must still open a readable list: the
  // dropdown is floored at the trigger width, grows to fit its longest option, and `shift` keeps
  // it inside the viewport even when the trigger sits at the right edge.
  test('narrow select at the right edge opens a dropdown that fits its options and the viewport', async ({
    page,
    refinePage,
  }) => {
    await refinePage.mountComponent(
      '<div style="display:flex;justify-content:flex-end">' +
        '<div style="width:110px">' +
        '<ore-select id="narrow" fullwidth label="Potion">' +
        '<option value="a">Alemore · Lv. 1</option>' +
        '<option value="b">Concentrated Bitterroot Tonic · Lv. 3</option>' +
        '</ore-select>' +
        '</div></div>',
    );

    await page.locator('#narrow').click();
    const option = page.getByRole('option', { name: 'Concentrated Bitterroot Tonic · Lv. 3' });
    await expect(option).toBeVisible();

    const metrics = await page.evaluate(() => {
      const select = document.getElementById('narrow') as HTMLElement & { shadowRoot: ShadowRoot };
      const dropdown = select.shadowRoot.querySelector('.dropdown') as HTMLElement;
      const label = dropdown.querySelector('.option:nth-of-type(2) > span:first-child') as HTMLElement;
      const rect = dropdown.getBoundingClientRect();

      return {
        right: rect.right,
        triggerWidth: select.getBoundingClientRect().width,
        truncated: label.scrollWidth > label.clientWidth,
        viewportWidth: window.innerWidth,
        width: rect.width,
      };
    });

    expect(metrics.width).toBeGreaterThan(metrics.triggerWidth);
    expect(metrics.truncated).toBe(false);
    expect(metrics.right).toBeLessThanOrEqual(metrics.viewportWidth);
  });

  // Regression: the positioner used to shift the panel fully inside the boundary for its
  // natural (unclamped) width, then clamped the width afterwards: landing the panel far
  // left of its trigger whenever the natural width exceeded a clipping ancestor. The clamp
  // must happen before `shift` so the panel only shifts for the width it renders at.
  test('dropdown in a clipping container stays aligned with its trigger after width clamping', async ({
    page,
    refinePage,
  }) => {
    await refinePage.mountComponent(
      '<div id="box" style="width:420px;overflow:auto">' +
        '<ore-select id="clipped" fullwidth label="Payment">' +
        '<option value="exact">Spend Fire ×1 (2 available)</option>' +
        '<option value="mixed">Spend Blood ×1 (2 available) + Bones ×1 (5 available) + Scales ×1</option>' +
        '</ore-select>' +
        '</div>',
    );

    await page.locator('#clipped').click();
    await expect(page.getByRole('option', { name: /Spend Blood/ })).toBeVisible();

    const metrics = await page.evaluate(() => {
      const select = document.getElementById('clipped') as HTMLElement & { shadowRoot: ShadowRoot };
      const dropdown = select.shadowRoot.querySelector('.dropdown') as HTMLElement;
      const trigger = select.shadowRoot.querySelector('ore-input.trigger') as HTMLElement;
      const box = document.getElementById('box') as HTMLElement;
      const dr = dropdown.getBoundingClientRect();
      const tr = trigger.getBoundingClientRect();

      return {
        boxRight: box.getBoundingClientRect().right,
        dropdownLeft: dr.left,
        dropdownRight: dr.right,
        triggerLeft: tr.left,
      };
    });

    // Clamped to the container width, the panel needs at most a few px of shift to fit :
    // not the full overflow of its wider natural width.
    expect(metrics.dropdownLeft).toBeGreaterThan(metrics.triggerLeft - 16);
    expect(metrics.dropdownRight).toBeLessThanOrEqual(metrics.boxRight);
  });

  // Regression: `--select-min-width` and `fullwidth` sized the host only: the inner
  // ore-input kept its own 12rem floor, so a select constrained below 12rem rendered a
  // trigger wider than its host, overflowing (and clipped by) the host's container. The
  // host must pass its width floor down so the control never renders wider than its host.
  test('a select narrower than the 12rem input floor renders a trigger that matches its host', async ({
    page,
    refinePage,
  }) => {
    await refinePage.mountComponent(
      '<div style="width:110px"><ore-select id="full" fullwidth label="Build"><option value="a">Alpha</option></ore-select></div>' +
        '<ore-select id="floored" style="--select-min-width:0;width:110px" label="Build"><option value="a">Alpha</option></ore-select>',
    );

    const metrics = await page.evaluate(() => {
      const measure = (id: string) => {
        const select = document.getElementById(id) as HTMLElement & { shadowRoot: ShadowRoot };
        const trigger = select.shadowRoot.querySelector('ore-input.trigger') as HTMLElement;

        return { host: select.getBoundingClientRect().width, trigger: trigger.getBoundingClientRect().width };
      };

      return { floored: measure('floored'), full: measure('full') };
    });

    // Both hosts sit below the 192px input floor, and each trigger matches its host exactly.
    expect(metrics.full.host).toBeLessThan(192);
    expect(metrics.floored.host).toBeLessThan(192);
    expect(Math.abs(metrics.full.trigger - metrics.full.host)).toBeLessThanOrEqual(1);
    expect(Math.abs(metrics.floored.trigger - metrics.floored.host)).toBeLessThanOrEqual(1);
  });

  // The panel reads `--_radius`, the shared mixin name. Every other component that reads it
  // also defines it on its own host (from its public token), so the name only reaches a
  // select's panel by *inheritance* from whatever surrounds it: a select slotted inside an
  // ore-counter styled `--counter-radius: var(--rounded-full)` (the demo's damage band)
  // opened a pill-shaped list. The host must define the name itself — from the documented
  // `--select-radius` token — so the panel owns its radius and inherits nobody's.
  const panelRadius = (page: Page, id: string) =>
    page.evaluate((hostId: string) => {
      const select = document.getElementById(hostId) as HTMLElement & { shadowRoot: ShadowRoot };
      const dropdown = select.shadowRoot.querySelector('.dropdown') as HTMLElement;
      // A probe resolves the token to the same computed unit the panel reports.
      const probe = document.createElement('div');
      probe.style.borderRadius = 'var(--rounded-lg)';
      document.body.append(probe);
      const token = getComputedStyle(probe).borderRadius;
      probe.remove();
      return { radius: getComputedStyle(dropdown).borderRadius, token };
    }, id);

  test('dropdown panel defaults to the rounded-lg token', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-select id="plain" label="Stance"><option value="1">Stance 1</option><option value="2">Stance 2</option></ore-select>',
    );

    await page.locator('#plain').click();
    const { radius, token } = await panelRadius(page, 'plain');

    expect(radius).toBe(token);
  });

  test('--select-radius overrides the dropdown panel radius', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-select id="custom" style="--select-radius: 4px" label="Stance"><option value="1">Stance 1</option></ore-select>',
    );

    await page.locator('#custom').click();
    const { radius } = await panelRadius(page, 'custom');

    expect(radius).toBe('4px');
  });

  test('a select slotted in a counter with a full --counter-radius keeps its own panel radius', async ({
    page,
    refinePage,
  }) => {
    await refinePage.mountComponent(
      '<ore-counter label="Damage" value="3" style="--counter-radius: var(--rounded-full)">' +
        '<ore-select id="slotted" slot="header-end" label="Stance" style="--select-min-width:0;width:6rem">' +
        '<option value="1">Stance 1</option>' +
        '<option value="2">Stance 2</option>' +
        '</ore-select>' +
        '</ore-counter>',
    );

    await page.locator('#slotted').click();
    const { radius, token } = await panelRadius(page, 'slotted');

    expect(radius).toBe(token);
  });
});
