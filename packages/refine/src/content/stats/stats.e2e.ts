import { axeCheck, expect, test } from '../../testing/fixtures';

test.describe('Accessibility', () => {
  for (const mode of ['light', 'dark']) {
    test(`${mode} stats card passes axe checks`, async ({ page, refinePage }) => {
      await refinePage.mountComponent(
        '<ore-stats color="success" label="Recurring revenue" value="$42,800" trend="+12%" trend-direction="up" description="from last month">' +
          '<ore-icon slot="icon" name="chart-line" aria-hidden="true"></ore-icon>' +
          '</ore-stats>',
      );
      await page.evaluate((theme) => {
        document.documentElement.className = theme;
      }, mode);

      const results = await axeCheck(page);

      expect(results.violations).toEqual([]);
    });
  }
});

test.describe('Layout', () => {
  test('value and visual share the body without overflow', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<div style="width:320px">' +
        '<ore-stats id="stats" label="Productive time" value="12.4 hr" trend="+23%" description="last week">' +
        '<svg slot="visual" viewBox="0 0 100 32" style="display:block;width:100%;height:32px"><path d="M0 28 L20 20 L40 22 L60 8 L80 14 L100 4" fill="none" stroke="currentColor"/></svg>' +
        '</ore-stats>' +
        '</div>',
    );

    const bounds = await page.locator('#stats').evaluate((card) => {
      const root = card.shadowRoot!;
      const surface = root.querySelector<HTMLElement>('[part="card"]')!.getBoundingClientRect();
      const value = root.querySelector<HTMLElement>('[part="value"]')!.getBoundingClientRect();
      const visual = root.querySelector<HTMLElement>('[part="visual"]')!.getBoundingClientRect();

      return { surface: surface.toJSON(), value: value.toJSON(), visual: visual.toJSON() };
    });

    expect(bounds.value.left).toBeGreaterThanOrEqual(bounds.surface.left);
    expect(bounds.visual.right).toBeLessThanOrEqual(bounds.surface.right);
    expect(bounds.value.right).toBeLessThanOrEqual(bounds.visual.left);
  });

  test('plain cards remove their own surface geometry', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-stats id="stats" variant="plain" label="Open pipeline" value="$120,000"></ore-stats>',
    );

    const style = await page.locator('#stats').evaluate((card) => {
      const surface = card.shadowRoot!.querySelector<HTMLElement>('[part="card"]')!;
      const computed = getComputedStyle(surface);

      return { borderWidth: computed.borderWidth, minHeight: computed.minHeight };
    });

    expect(style.borderWidth).toBe('0px');
    expect(style.minHeight).toBe('0px');
  });
});
