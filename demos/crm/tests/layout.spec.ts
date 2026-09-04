import { expect, test } from 'playwright/test';

const DESKTOP_WIDTHS = [1280, 1366, 1440, 1600] as const;

const ROUTES: Array<{ name: string; path: string }> = [
  { name: 'Overview', path: '/' },
  { name: 'Pipeline', path: '/pipeline' },
  { name: 'Company profile', path: '/companies/company-1' },
  { name: 'Contacts', path: '/contacts' },
  { name: 'Activity', path: '/activity' },
  { name: 'Showcase', path: '/showcase' },
];

for (const width of DESKTOP_WIDTHS) {
  for (const route of ROUTES) {
    test(`no horizontal overflow at ${width}px on ${route.name}`, async ({ page }) => {
      await page.setViewportSize({ height: 900, width });
      await page.goto(route.path);
      await page.waitForLoadState('networkidle');
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const innerWidth = await page.evaluate(() => window.innerWidth);
      expect(scrollWidth, `scrollWidth ${scrollWidth} exceeds viewport ${innerWidth}`).toBeLessThanOrEqual(innerWidth);
    });
  }
}

for (const width of DESKTOP_WIDTHS) {
  test(`user selector stays within viewport at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ height: 900, width });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const hostBox = await page.locator('.user-switcher').boundingBox();
    const viewportWidth = page.viewportSize()?.width ?? width;
    expect(hostBox).toBeTruthy();
    expect(hostBox!.x + hostBox!.width, 'host right edge exceeds viewport').toBeLessThanOrEqual(viewportWidth);
    const triggerRight = await page.evaluate(() => {
      const host = document.querySelector('.user-switcher');
      if (!host || !host.shadowRoot) return null;
      const trigger = host.shadowRoot.querySelector('.trigger');
      if (!trigger) return null;
      const rect = (trigger as HTMLElement).getBoundingClientRect();
      return rect.right;
    });
    if (triggerRight !== null) {
      expect(triggerRight, 'shadow trigger right edge exceeds viewport').toBeLessThanOrEqual(viewportWidth);
    }
  });
}

test('sidebar expands on desktop and collapses on tablet', async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto('/');
  const sidebar = page.locator('#crm-sidebar');
  const toggle = sidebar.locator('[part="toggle-btn"]');
  const header = sidebar.locator('[part="header"]');
  const expandedPadding = await header.evaluate((element) => getComputedStyle(element).padding);
  const expandedHeight = (await header.boundingBox())!.height;

  await expect(sidebar).not.toHaveAttribute('data-collapsed');
  await expect.poll(async () => (await sidebar.boundingBox())?.width).toBe(280);
  await expect(toggle.locator('ore-icon')).toHaveAttribute('name', 'panel-left-close');
  const navbarBox = await page.locator('.signal-topbar').boundingBox();
  const toggleBox = await toggle.boundingBox();
  expect(toggleBox!.y).toBeGreaterThanOrEqual(navbarBox!.y + navbarBox!.height);

  await page.setViewportSize({ height: 900, width: 1024 });
  await expect(sidebar).toHaveAttribute('data-collapsed');
  await expect.poll(async () => (await sidebar.boundingBox())?.width).toBe(65);
  await expect(toggle.locator('ore-icon')).toHaveAttribute('name', 'panel-left-open');
  expect(await header.evaluate((element) => getComputedStyle(element).padding)).toBe(expandedPadding);
  expect((await header.boundingBox())!.height).toBe(expandedHeight);
});

test('tablet navbar keeps account controls readable through the mobile breakpoint', async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1024 });
  await page.goto('/');
  const navbar = page.locator('.signal-topbar');
  const userSwitcher = page.locator('.user-switcher');

  for (const width of [1024, 921]) {
    await page.setViewportSize({ height: 900, width });
    await expect(navbar).not.toHaveAttribute('data-mobile');
    await expect(userSwitcher).toBeVisible();
    await expect(page.locator('.status-control')).toBeHidden();
    const geometry = await page.evaluate(() => {
      const actions = document.querySelector('.topbar-actions')?.getBoundingClientRect();
      const nav = document.querySelector('.signal-topbar')?.getBoundingClientRect();
      const search = document.querySelector('.search-trigger--desktop')?.getBoundingClientRect();
      const user = document.querySelector('.user-switcher')?.getBoundingClientRect();

      return {
        actions: actions?.toJSON(),
        nav: nav?.toJSON(),
        search: search?.toJSON(),
        user: user?.toJSON(),
      };
    });

    expect(geometry.user?.width).toBeGreaterThanOrEqual(192);
    expect(geometry.search?.right).toBeLessThanOrEqual(geometry.actions?.left ?? 0);
    expect(geometry.actions?.right).toBeLessThanOrEqual(geometry.nav?.right ?? 0);
  }

  await page.setViewportSize({ height: 900, width: 920 });
  await expect(navbar).toHaveAttribute('data-mobile');
  await expect(userSwitcher).toBeHidden();
  await expect(page.locator('.search-trigger--mobile')).toBeVisible();
});

test('sidebar and navbar form mobile app shell without overflow', async ({ page }) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto('/');
  const sidebar = page.locator('#crm-sidebar');

  await expect(sidebar).toHaveAttribute('data-bottom-nav');
  const shell = await page.evaluate(() => {
    const sidebar = document.querySelector('#crm-sidebar');
    const navbar = document.querySelector('.signal-topbar');
    const bottomBar = sidebar?.shadowRoot?.querySelector('[part="bottom-bar"]');

    return {
      bottom: bottomBar?.getBoundingClientRect().toJSON(),
      navbar: navbar?.getBoundingClientRect().toJSON(),
      scrollWidth: document.documentElement.scrollWidth,
      tabs: bottomBar?.querySelectorAll('.bottom-tab').length,
    };
  });

  expect(shell.tabs).toBe(4);
  expect(shell.navbar?.left).toBeGreaterThanOrEqual(0);
  expect(shell.navbar?.right).toBeLessThanOrEqual(390);
  expect(shell.bottom?.left).toBeGreaterThanOrEqual(0);
  expect(shell.bottom?.right).toBeLessThanOrEqual(390);
  expect(shell.scrollWidth).toBeLessThanOrEqual(390);
});

test('CRM metric groups use ore-stats', async ({ page }) => {
  for (const metricGroup of [
    { count: 4, path: '/', selector: '.signal-kpis' },
    { count: 3, path: '/companies', selector: '.record-metrics' },
    { count: 4, path: '/opportunities', selector: '.record-metrics' },
    { count: 4, path: '/leads', selector: '.record-metrics' },
    { count: 4, path: '/companies/company-1', selector: '.profile-metrics' },
    { count: 4, path: '/pipeline', selector: '.pipeline-summary' },
  ]) {
    await page.goto(metricGroup.path);
    const group = page.locator(metricGroup.selector);

    await expect(group.locator(':scope > ore-stats')).toHaveCount(metricGroup.count);
    await expect(group.locator(':scope > crm-kpi, :scope > article')).toHaveCount(0);
  }
});

test('CRM progress indicators use ore-progress', async ({ page }) => {
  await page.goto('/');
  const sourceProgress = page.locator('.source-performance ore-progress');
  await expect(sourceProgress).toHaveCount(4);
  await expect(page.locator('.source-performance').getByRole('progressbar')).toHaveCount(4);
  await expect(page.locator('.source-performance i')).toHaveCount(0);

  await page.goto('/pipeline');
  await page.getByRole('tab', { name: 'Forecast' }).click();
  const forecastProgress = page.locator('.pipeline-forecast ore-progress');
  await expect(forecastProgress).toHaveCount(6);
  await expect(page.locator('.pipeline-forecast').getByRole('progressbar')).toHaveCount(6);
  await expect(page.locator('.pipeline-forecast i')).toHaveCount(0);
});

test('company marks and owner avatars preserve row identity inside the datagrid', async ({ page }) => {
  await page.goto('/companies');
  const grid = page.locator('ore-datagrid');
  const mark = grid.locator('company-mark').first();
  await expect(mark.locator('.company-mark__bar')).toHaveCount(4);
  const ownerInitials = await grid
    .locator('owner-chip ore-avatar')
    .evaluateAll((avatars) =>
      avatars.slice(0, 4).map((avatar) => avatar.shadowRoot?.querySelector('.initials')?.textContent?.trim()),
    );
  expect(new Set(ownerInitials)).toEqual(new Set(['AM', 'SC']));

  await page.goto('/companies/company-1');
  await expect(page.locator('.company-hero company-mark .company-mark__bar')).toHaveCount(4);
});

test('datagrid search filters by visible CRM cell values', async ({ page }) => {
  await page.goto('/companies');
  const grid = page.locator('ore-datagrid');
  await grid.getByRole('button', { exact: true, name: 'Search' }).click();
  await grid.getByRole('searchbox', { name: 'Search' }).fill('Sarah Chen');
  await expect(grid.locator('owner-chip')).toHaveCount(10);
  await expect(grid.locator('owner-chip')).toContainText(Array.from({ length: 10 }, () => 'Sarah Chen'));
});

test('datagrid date filters use formatted labels and chronological comparisons', async ({ page }) => {
  await page.goto('/companies');
  const grid = page.locator('ore-datagrid');
  await grid.getByRole('button', { name: 'Filter' }).click();
  await grid.getByRole('combobox', { name: 'Add filter…' }).click();
  await page.getByRole('option', { exact: true, name: 'Last activity' }).click();
  const operator = grid.locator('ore-select[label="Last activity operator"]');
  const dates = grid.locator('.dg-body .dg-tr .dg-td:last-child');

  await operator.click();
  await page.getByRole('option', { exact: true, name: 'Greater than' }).click();
  await grid.getByRole('combobox', { exact: true, name: 'Last activity' }).click();
  await expect(page.getByRole('option', { exact: true, name: '31/08/2026' })).toHaveCount(1);
  await expect(page.getByRole('option', { name: /2026-08-31T/ })).toHaveCount(0);
  await page.getByRole('option', { exact: true, name: '29/08/2026' }).click();
  expect(new Set((await dates.allTextContents()).map((date) => date.trim()))).toEqual(
    new Set(['30/08/2026', '31/08/2026']),
  );

  await operator.click();
  await page.getByRole('option', { exact: true, name: 'Less than' }).click();
  const earlierDates = (await dates.allTextContents()).map((date) => date.trim());
  expect(earlierDates).not.toEqual(expect.arrayContaining(['29/08/2026', '30/08/2026', '31/08/2026']));
});

test('record views use localized Refine datagrids with rich cells', async ({ page }) => {
  for (const recordView of [
    { path: '/companies', rows: 10, tabs: ['All accounts', 'Healthy', 'At risk'] },
    { path: '/opportunities', rows: 10, tabs: ['All opportunities', 'Open', 'Won', 'Lost'] },
    { path: '/leads', rows: 10, tabs: ['All leads', 'New', 'Working', 'Qualified'] },
    { path: '/contacts', rows: 10, tabs: ['All contacts', 'Recently active', 'Needs follow-up'] },
  ]) {
    await page.goto(recordView.path);
    const grid = page.locator('ore-datagrid');

    await expect(grid).toBeVisible();
    await expect(page.locator('.table-wrap')).toHaveCount(0);
    await expect(grid.getByRole('grid')).toBeVisible();
    await expect(grid.getByRole('row')).toHaveCount(recordView.rows + 1);
    await expect(grid.getByRole('button', { name: 'Sort' })).toBeVisible();
    await expect(grid.getByRole('button', { name: 'Filter' })).toBeVisible();
    await expect(grid.getByRole('button', { name: 'Column options' })).toBeVisible();
    await expect(grid.getByRole('tab')).toHaveCount(recordView.tabs.length);
    expect((await grid.getByRole('tab').allTextContents()).map((label) => label.trim())).toEqual(recordView.tabs);
    const allRowsRange = await grid.locator('.dg-footer-info').textContent();
    await grid.getByRole('tab', { name: recordView.tabs[1] }).click();
    await expect(grid.getByRole('tab', { name: recordView.tabs[1] })).toHaveAttribute('aria-selected', 'true');
    await expect(grid.locator('.dg-footer-info')).not.toHaveText(allRowsRange ?? '');
  }

  await page.goto('/companies');
  await expect(page.locator('ore-datagrid').getByRole('link', { name: /Acme Corporation/ })).toBeVisible();
  await page.goto('/opportunities');
  await expect(page.locator('ore-datagrid').getByRole('button', { name: 'Acme Enterprise Contract' })).toBeVisible();
  await page.goto('/contacts');
  const contacts = page.locator('ore-datagrid');
  const allContactsRange = await contacts.locator('.dg-footer-info').textContent();
  await contacts.getByRole('tab', { name: 'Recently active' }).click();
  await expect(contacts.getByRole('tab', { name: 'Recently active' })).toHaveAttribute('aria-selected', 'true');
  await expect(contacts.locator('.dg-footer-info')).not.toHaveText(allContactsRange ?? '');
  await expect(page.locator('.virtual-contacts, .saved-views')).toHaveCount(0);
});

test('labeled CRM button icons use prefix or suffix slots', async ({ page }) => {
  for (const path of ['/', '/pipeline', '/companies', '/contacts', '/activity', '/companies/company-1']) {
    await page.goto(path);
    const invalidIcons = await page.locator('ore-button').evaluateAll((buttons) =>
      buttons.flatMap((button) => {
        const label = button.textContent?.trim() ?? '';
        if (!label) return [];

        return [...button.children]
          .filter(
            (child) =>
              child.localName === 'ore-icon' && !['prefix', 'suffix'].includes(child.getAttribute('slot') ?? ''),
          )
          .map((icon) => ({ button: label, icon: icon.getAttribute('name') ?? '' }));
      }),
    );

    expect(invalidIcons).toEqual([]);
  }
});

test('dashboard stacks compact activity and lead sources beside pipeline', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.dashboard-secondary')).toBeVisible();
  const composition = await page.evaluate(() => {
    const secondary = document.querySelector<HTMLElement>('.dashboard-secondary')!;
    const pipeline = document.querySelector<HTMLElement>('.dashboard-pipeline-distribution')!;
    const stack = document.querySelector<HTMLElement>('.dashboard-secondary-stack')!;
    const activity = document.querySelector<HTMLElement>('.activity-module')!;
    const sources = document.querySelector<HTMLElement>('.source-performance')!;
    const signal = activity.querySelector('activity-signal')!;
    const workspace = document.querySelector<HTMLElement>('.signal-main')!.getBoundingClientRect();

    return {
      activityIndex: [...stack.children].indexOf(activity),
      activityRect: activity.getBoundingClientRect().toJSON(),
      compact: signal.hasAttribute('compact'),
      pipelineIndex: [...secondary.children].indexOf(pipeline),
      pipelineRect: pipeline.getBoundingClientRect().toJSON(),
      sourcesIndex: [...stack.children].indexOf(sources),
      sourcesRect: sources.getBoundingClientRect().toJSON(),
      stackIndex: [...secondary.children].indexOf(stack),
      workspace: workspace.toJSON(),
    };
  });

  expect(composition.pipelineIndex).toBe(0);
  expect(composition.stackIndex).toBe(1);
  expect(composition.activityIndex).toBe(0);
  expect(composition.sourcesIndex).toBe(1);
  expect(composition.compact).toBe(true);
  expect(Math.abs(composition.activityRect.height - composition.sourcesRect.height)).toBeLessThanOrEqual(1);
  for (const card of [composition.pipelineRect, composition.activityRect, composition.sourcesRect]) {
    expect(card.left).toBeGreaterThanOrEqual(composition.workspace.left);
    expect(card.right).toBeLessThanOrEqual(composition.workspace.right);
  }
});

test('dashboard Activity Signal uses its full card width', async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1440 });
  await page.goto('/');
  await expect(page.locator('.activity-module activity-signal')).toBeVisible();
  const layout = () =>
    page.evaluate(() => {
      const surface = document.querySelector<HTMLElement>('.activity-module .activity-signal__surface--compact')!;
      const grid = surface.querySelector<HTMLElement>('.activity-signal__grid')!;
      const summary = surface.querySelector<HTMLElement>('.activity-signal__summary')!;
      const legend = surface.querySelector<HTMLElement>('.activity-signal__legend')!;

      return {
        grid: grid.getBoundingClientRect().toJSON(),
        legend: legend.getBoundingClientRect().toJSON(),
        legendDisplay: getComputedStyle(legend).display,
        summary: summary.getBoundingClientRect().toJSON(),
        summaryDisplay: getComputedStyle(summary).display,
        surface: surface.getBoundingClientRect().toJSON(),
      };
    });

  const desktop = await layout();
  expect(desktop.surface.width).toBeGreaterThan(desktop.grid.width * 1.5);
  expect(desktop.summary.left).toBeGreaterThanOrEqual(desktop.grid.right);
  expect(desktop.legend.left).toBeGreaterThanOrEqual(desktop.grid.right);
  expect(desktop.summaryDisplay).not.toBe('none');
  expect(desktop.legendDisplay).not.toBe('none');

  await page.setViewportSize({ height: 844, width: 390 });
  const mobile = await layout();
  expect(mobile.summary.bottom).toBeLessThanOrEqual(mobile.grid.top);
  expect(
    Math.abs((mobile.grid.left + mobile.grid.right) / 2 - (mobile.surface.left + mobile.surface.right) / 2),
  ).toBeLessThanOrEqual(1);
});

test('Activity Signal heatmaps fill and center across routes', async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1440 });
  for (const path of ['/activity', '/showcase', '/companies/company-1']) {
    await page.goto(path);
    await expect(page.locator('activity-signal:not([compact])').first()).toBeVisible();
    const geometry = await page
      .locator('activity-signal:not([compact])')
      .first()
      .evaluate((signal) => {
        const surface = signal.querySelector<HTMLElement>('.activity-signal__surface')!;
        const grid = signal.querySelector<HTMLElement>('.activity-signal__grid')!;
        const row = signal.querySelector<HTMLElement>('.activity-signal__row')!;
        const cell = signal.querySelector<HTMLElement>('.activity-signal__cell')!;

        return {
          cell: cell.getBoundingClientRect().toJSON(),
          grid: grid.getBoundingClientRect().toJSON(),
          row: row.getBoundingClientRect().toJSON(),
          surface: surface.getBoundingClientRect().toJSON(),
        };
      });

    expect(geometry.grid.width).toBeGreaterThanOrEqual(Math.min(720, geometry.surface.width) - 1);
    expect(geometry.grid.width).toBeGreaterThan(geometry.surface.width * 0.5);
    expect(geometry.cell.width).toBeGreaterThan(geometry.cell.height);
    expect(geometry.cell.height).toBeLessThanOrEqual(24);
    expect(
      Math.abs((geometry.grid.left + geometry.grid.right) / 2 - (geometry.surface.left + geometry.surface.right) / 2),
    ).toBeLessThanOrEqual(1);
    expect(Math.abs(geometry.row.width - geometry.grid.width)).toBeLessThanOrEqual(1);
  }
});

test('Pipeline stage changes render as a responsive Prism sparkline', async ({ page }) => {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ height: 844, width });
    await page.goto('/pipeline');
    const summary = page.locator('.pipeline-summary');
    const sparkline = summary.locator('.pipeline-stage-changes__sparkline');
    const svg = sparkline.locator('svg');

    await expect(summary.locator(':scope > ore-stats')).toHaveCount(4);
    await expect(summary.locator(':scope > activity-signal')).toHaveCount(0);
    await expect(svg).toBeVisible();
    await expect(svg).toHaveAttribute('aria-hidden', 'true');
    const containerBox = await sparkline.boundingBox();
    const svgBox = await svg.boundingBox();
    expect(containerBox).not.toBeNull();
    expect(svgBox).not.toBeNull();
    expect(svgBox!.width).toBeLessThanOrEqual(containerBox!.width + 1);
    expect(svgBox!.height).toBeLessThanOrEqual(containerBox!.height + 1);
  }
});

test('dashboard chart heights remain stable across viewport cycles', async ({ page }) => {
  const dimensions = () =>
    page.evaluate(() => {
      const forecastCard = document.querySelector<HTMLElement>('.module--forecast')!;
      const attentionCard = document.querySelector<HTMLElement>('.attention-queue')!;
      const forecast = forecastCard.querySelector<HTMLElement>('.signal-chart')!;
      const stage = document.querySelector<HTMLElement>('.dashboard-pipeline-distribution .signal-chart')!;

      return {
        attentionCard: attentionCard.getBoundingClientRect().height,
        forecast: forecast.getBoundingClientRect().height,
        forecastCard: forecastCard.getBoundingClientRect().height,
        forecastSvg: forecast.querySelector('svg')?.getBoundingClientRect().height ?? 0,
        stage: stage.getBoundingClientRect().height,
        stageSvg: stage.querySelector('svg')?.getBoundingClientRect().height ?? 0,
      };
    });

  await page.setViewportSize({ height: 900, width: 1440 });
  await page.goto('/');
  await expect
    .poll(async () => {
      const state = await dimensions();
      return Math.abs(state.forecastCard - state.attentionCard);
    })
    .toBeLessThanOrEqual(1);
  const desktop = await dimensions();
  expect(desktop.forecast).toBeGreaterThanOrEqual(280);
  expect(Math.abs(desktop.forecastCard - desktop.attentionCard)).toBeLessThanOrEqual(1);
  expect(desktop.forecastSvg).toBeLessThanOrEqual(desktop.forecast + 1);
  expect(desktop.stageSvg).toBeLessThanOrEqual(desktop.stage + 1);

  for (let cycle = 0; cycle < 2; cycle++) {
    await page.setViewportSize({ height: 844, width: 390 });
    await expect.poll(async () => (await dimensions()).forecast).toBe(200);
    const mobile = await dimensions();
    expect(mobile.forecast).toBeLessThan(desktop.forecast);
    expect(mobile.stage).toBeLessThan(desktop.stage);
    expect(mobile.forecastSvg).toBeLessThanOrEqual(mobile.forecast + 1);
    expect(mobile.stageSvg).toBeLessThanOrEqual(mobile.stage + 1);

    await page.setViewportSize({ height: 900, width: 1440 });
    await expect
      .poll(async () => {
        const state = await dimensions();
        return Math.max(Math.abs(state.forecast - desktop.forecast), Math.abs(state.stage - desktop.stage));
      })
      .toBeLessThanOrEqual(1);
    const restored = await dimensions();
    expect(restored.forecast).toBe(desktop.forecast);
    expect(restored.forecastSvg).toBeLessThanOrEqual(restored.forecast + 1);
    expect(restored.stageSvg).toBeLessThanOrEqual(restored.stage + 1);
  }
});

test('pipeline chart remains bounded during gradual viewport resizing', async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1440 });
  await page.goto('/');
  const chartHeight = () =>
    page
      .locator('.dashboard-pipeline-distribution .signal-chart')
      .evaluate((chart) => chart.getBoundingClientRect().height);

  for (const width of [
    1440, 1300, 1200, 1100, 1000, 930, 900, 700, 500, 390, 500, 700, 900, 930, 1000, 1100, 1200, 1300, 1440,
  ]) {
    await page.setViewportSize({ height: 900, width });
    const expected = width <= 480 ? 170 : width <= 920 ? 190 : Math.min(360, Math.max(280, width * 0.25));
    await expect.poll(chartHeight).toBeCloseTo(expected, 0);
  }
});

test('activity filters preserve equal panel insets', async ({ page }) => {
  await page.goto('/activity');
  await expect(page.locator('.activity-filters')).toBeVisible();
  const geometry = await page.evaluate(() => {
    const panel = document.querySelector<HTMLElement>('.activity-filters')!;
    const selects = [...panel.querySelectorAll<HTMLElement>('ore-select')];
    const panelRect = panel.getBoundingClientRect();

    return selects.map((select) => {
      const rect = select.getBoundingClientRect();

      return {
        leftInset: rect.left - panelRect.left,
        rightInset: panelRect.right - rect.right,
        width: rect.width,
      };
    });
  });

  expect(geometry).toHaveLength(2);
  for (const select of geometry) expect(Math.abs(select.leftInset - select.rightInset)).toBeLessThanOrEqual(1);
  expect(Math.abs(geometry[0].width - geometry[1].width)).toBeLessThanOrEqual(1);
});

test('dark-mode rail avatar meets WCAG AA contrast', async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1440 });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  const themeButton = page.getByRole('button', { name: /Switch to dark/ });
  if ((await themeButton.count()) > 0) {
    await themeButton.click();
    await page.waitForTimeout(200);
  }
  const contrast = await page.evaluate(() => {
    const avatar = document.querySelector('.rail-avatar');
    if (!avatar) return null;
    const cs = getComputedStyle(avatar);
    const fg = cs.color;
    const bg = cs.backgroundColor;
    const toRgb = (str: string): [number, number, number] => {
      const m = str.match(/rgba?\(([^)]+)\)/);
      if (!m) return [0, 0, 0];
      const parts = m[1].split(',').map((p) => Number.parseFloat(p.trim()));
      return [parts[0], parts[1], parts[2]];
    };
    const luminance = (r: number, g: number, b: number): number => {
      const ch = (c: number): number => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
    };
    const [fr, fgc, fb] = toRgb(fg);
    const [br, bgc, bb] = toRgb(bg);
    const l1 = luminance(fr, fgc, fb);
    const l2 = luminance(br, bgc, bb);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  });
  expect(contrast, 'avatar contrast must be at least 4.5:1').toBeGreaterThanOrEqual(4.5);
});

test('light-mode rail avatar meets WCAG AA contrast', async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1440 });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  const contrast = await page.evaluate(() => {
    const avatar = document.querySelector('.rail-avatar');
    if (!avatar) return null;
    const cs = getComputedStyle(avatar);
    const fg = cs.color;
    const bg = cs.backgroundColor;
    const toRgb = (str: string): [number, number, number] => {
      const m = str.match(/rgba?\(([^)]+)\)/);
      if (!m) return [0, 0, 0];
      const parts = m[1].split(',').map((p) => Number.parseFloat(p.trim()));
      return [parts[0], parts[1], parts[2]];
    };
    const luminance = (r: number, g: number, b: number): number => {
      const ch = (c: number): number => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
    };
    const [fr, fgc, fb] = toRgb(fg);
    const [br, bgc, bb] = toRgb(bg);
    const l1 = luminance(fr, fgc, fb);
    const l2 = luminance(br, bgc, bb);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  });
  expect(contrast, 'avatar contrast must be at least 4.5:1').toBeGreaterThanOrEqual(4.5);
});

test('favicon.svg is served with SVG content type', async ({ request }) => {
  const response = await request.get('/favicon.svg');
  expect(response.status(), 'favicon should return 200').toBe(200);
  const contentType = response.headers()['content-type'] ?? '';
  expect(contentType, 'content type should be image/svg+xml').toContain('image/svg+xml');
});

test('mobile 390px has no page-level overflow', async ({ page }) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const innerWidth = await page.evaluate(() => window.innerWidth);
  expect(scrollWidth, `mobile scrollWidth ${scrollWidth} exceeds viewport ${innerWidth}`).toBeLessThanOrEqual(
    innerWidth,
  );
});
