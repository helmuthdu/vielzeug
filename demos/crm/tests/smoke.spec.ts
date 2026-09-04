import { expect, test } from 'playwright/test';

test('dashboard, search and pipeline are reachable', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Good (morning|afternoon|evening), Alex/ })).toBeVisible();
  await page.keyboard.press('Control+K');
  await page.getByRole('combobox', { name: 'Search CRM or run a command…' }).fill('Acme');
  await expect(page.getByLabel('Commands').getByText('Acme Corporation', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('link', { exact: true, name: 'Pipeline' }).click();
  await expect(page.getByRole('heading', { name: 'Pipeline' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open Acme Enterprise Contract' })).toBeVisible();
});

test('reopens command search after executing a command', async ({ page }) => {
  await page.goto('/');
  const search = page.locator('.search-trigger:visible');
  const dialog = page.getByRole('dialog', { name: 'Search Vielzeug' });

  await search.click();
  await page.getByRole('option', { name: 'Toggle theme' }).click();
  await expect(dialog).toBeHidden();
  await search.click();
  await expect(dialog).toBeVisible();
});

test('opens an opportunity from the actionable Needs attention list', async ({ page }) => {
  await page.goto('/');
  const attention = page.locator('.attention-queue');

  await expect(attention.getByRole('list')).toBeVisible();
  await expect(attention.getByRole('listitem')).toHaveCount(5);
  const firstDeal = attention.getByRole('button', { name: /Acme Enterprise Contract/ });
  await firstDeal.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('crm-record-drawer')).toContainText('Acme Enterprise Contract');
});

test('creates each entity through its matching form', async ({ page }) => {
  await page.goto('/companies');
  await page.getByRole('button', { name: 'New company' }).click();
  await page.getByLabel('Name').fill('Northstar Labs');
  await page.getByRole('button', { name: 'Create company' }).click();
  await expect(page.getByRole('link', { name: /Northstar Labs/ })).toBeVisible();

  await page.goto('/leads');
  await page.getByRole('button', { name: 'New lead' }).click();
  await page.getByLabel('Name').fill('Jordan Bell');
  await page.getByRole('button', { name: 'Create lead' }).click();
  await expect(page.getByRole('button', { name: 'Jordan Bell' })).toBeVisible();

  await page.goto('/contacts');
  await page.getByRole('button', { name: 'New contact' }).click();
  await page.getByRole('textbox', { name: 'Name' }).fill('Ada Stone');
  await page.getByRole('textbox', { name: 'Job title' }).fill('Chief Revenue Officer');
  await page.getByRole('textbox', { name: 'Email' }).fill('ada.stone@acme.example');
  await page.getByRole('button', { name: 'Create contact' }).click();
  await expect(page.getByRole('button', { name: 'Open Ada Stone' })).toBeVisible();

  await page.goto('/opportunities');
  await page.getByRole('button', { name: 'New opportunity' }).click();
  await page.getByLabel('Name').fill('Acme Renewal 2027');
  await page.getByRole('button', { name: 'Create opportunity' }).click();
  await expect(page.getByRole('button', { name: 'Acme Renewal 2027' })).toBeVisible();
});

test('opens a deep-linked company workspace', async ({ page }) => {
  await page.goto('/companies/company-1');
  await expect(page.getByRole('heading', { name: 'Acme Corporation' })).toBeVisible();
  await expect(page.getByText('Weighted forecast').first()).toBeVisible();
  await expect(page.getByRole('tab', { name: /Activity/ })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('tab', { name: /Opportunities/ }).click();
  await expect(page.getByRole('button', { name: /Acme Enterprise Contract/ })).toBeVisible();
  await page.locator('.breadcrumb').getByRole('link', { exact: true, name: 'Companies' }).click();
  await expect(page.getByRole('heading', { name: 'Companies' })).toBeVisible();
});

test('company tabs support keyboard navigation and lead mobile task order', async ({ page }) => {
  await page.goto('/companies/company-1');
  const activity = page.getByRole('tab', { name: /Activity/ });
  await activity.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: /Opportunities/ })).toHaveAttribute('aria-selected', 'true');

  const order = await page
    .locator('.company-workspace')
    .evaluate((workspace) => [...workspace.children].map((child) => child.className));
  expect(order).toEqual(['company-main', 'company-facts']);
});

test('pipeline drag-and-drop stays synchronized with Ore rendering', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Playwright dragTo exercises native desktop drag.');
  await page.goto('/pipeline');
  const card = page.locator('.pipeline-card[data-opportunity-id="opportunity-1"]');
  const negotiation = page.locator('.pipeline-column[data-stage="negotiation"] .pipeline-column__cards');

  await card.dragTo(negotiation.locator('.pipeline-card').first());
  await expect(negotiation).toContainText('Acme Enterprise Contract');
  await page.getByLabel('Notifications', { exact: true }).getByRole('button', { name: 'Undo' }).click();
  await expect(page.locator('.pipeline-column[data-stage="proposal"]')).toContainText('Acme Enterprise Contract');
});

test('pipeline offers an accessible stage move with visible undo', async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on('pageerror', (error) => pageErrors.push(error));
  await page.goto('/pipeline');
  await page.getByRole('button', { name: 'Open Acme Enterprise Contract' }).click();
  const drawer = page.locator('crm-record-drawer');
  const timelineSteps = drawer.locator('.drawer-timeline ore-step');
  await expect(timelineSteps).toHaveCount(5);
  await expect(timelineSteps.first()).toHaveAttribute('completed');
  await expect(timelineSteps.last()).toHaveAttribute('current');
  const connector = await timelineSteps.first().evaluate((step) => {
    const rect = step.shadowRoot!.querySelector('.connector-trailing')!.getBoundingClientRect();
    return { height: rect.height, width: rect.width };
  });
  expect(connector.height).toBeGreaterThan(8);
  expect(connector.width).toBe(2);
  const stageGeometry = await drawer.evaluate((element) => {
    const summary = element.querySelector('.record-summary')!.getBoundingClientRect();
    const stage = element.querySelector('.drawer-stage-control')!.getBoundingClientRect();
    return { left: Math.abs(stage.left - summary.left), width: Math.abs(stage.width - summary.width) };
  });
  expect(stageGeometry.left).toBeLessThanOrEqual(1);
  expect(stageGeometry.width).toBeLessThanOrEqual(1);
  await drawer.locator('ore-select[label="Move to stage…"]').click();
  await page.getByRole('option', { name: 'Negotiation' }).click();
  await expect(page.locator('.pipeline-column[data-stage="negotiation"]')).toContainText('Acme Enterprise Contract');
  await page.keyboard.press('Escape');
  await expect(drawer.getByRole('dialog')).toBeHidden();
  await page.getByLabel('Notifications', { exact: true }).getByRole('button', { name: 'Undo' }).click();
  await expect(page.locator('.pipeline-column[data-stage="proposal"]')).toContainText('Acme Enterprise Contract');
  expect(pageErrors).toEqual([]);
});

test('skip link, system theme and live presence stay synchronized', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#crm-main')).toBeFocused();

  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect(page.locator('.presence span')).toHaveCount(2);
  await expect(page.locator('.presence-count')).toHaveText('2');
  await expect(page.locator('.locale-button')).toHaveAttribute('aria-label', 'Language: English. Switch to German');
});

test('opens exact record details and edits an opportunity', async ({ page }) => {
  await page.goto('/pipeline');
  await page.getByRole('button', { name: 'Open Acme Enterprise Contract' }).click();
  await expect(page.locator('crm-record-drawer')).toContainText('€120,000');
  await page.getByRole('button', { name: 'Edit opportunity' }).click();
  await page.waitForTimeout(250);
  await page.getByLabel('Name').fill('Acme Enterprise Plus');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('button', { name: 'Open Acme Enterprise Plus' })).toBeVisible();

  await page.keyboard.press('Control+K');
  await page.getByRole('combobox', { name: 'Search CRM or run a command…' }).fill('John Smith');
  await page.getByLabel('Commands').getByText('John Smith', { exact: true }).click();
  await expect(page.locator('crm-record-drawer')).toContainText('VP Sales');
});

test('filters records and exposes truthful theme state', async ({ page }) => {
  await page.goto('/leads');
  const grid = page.locator('ore-datagrid');
  await grid.getByRole('button', { name: 'Filter' }).click();
  await grid.getByRole('combobox', { name: 'Add filter…' }).click();
  await page.getByRole('option', { exact: true, name: 'Status' }).click();
  await grid.getByRole('combobox', { exact: true, name: 'Status' }).click();
  await page.getByRole('option', { exact: true, name: 'Qualified' }).click();
  await expect(grid.getByRole('row')).toHaveCount(11);

  if ((page.viewportSize()?.width ?? 1000) < 600)
    await page.getByRole('button', { name: 'Open navigation menu' }).click();
  const theme = page.getByRole('button', { name: 'Theme: system. Switch to light' });
  await theme.click();
  await expect(page.getByRole('button', { name: 'Theme: light. Switch to dark' })).toBeVisible();
  await page.getByRole('button', { name: 'Theme: light. Switch to dark' }).click();
  await expect(page.getByRole('button', { name: 'Theme: dark. Switch to system' })).toBeVisible();
});

test('filters opportunity amounts with numeric operators', async ({ page }) => {
  await page.goto('/opportunities');
  const grid = page.locator('ore-datagrid');

  await grid.getByRole('button', { name: 'Filter' }).click();
  await grid.getByRole('combobox', { name: 'Add filter…' }).click();
  await page.getByRole('option', { exact: true, name: 'Amount' }).click();
  const operator = grid.locator('ore-select[label="Amount operator"]');
  await operator.click();
  await page.getByRole('option', { exact: true, name: 'Greater than' }).click();
  await grid.getByRole('combobox', { exact: true, name: 'Amount' }).click();
  await page.getByRole('option', { exact: true, name: '€120,000' }).click();
  await expect(grid.getByText('€153,100', { exact: true }).first()).toBeVisible();
  await expect(grid.getByText('€37,300', { exact: true })).toHaveCount(0);

  await operator.click();
  await page.getByRole('option', { exact: true, name: 'Less than' }).click();
  await expect(grid.getByText('€37,300', { exact: true }).first()).toBeVisible();
  await expect(grid.getByText('€153,100', { exact: true })).toHaveCount(0);
});

test('filters computed company pipeline values with numeric operators', async ({ page }) => {
  await page.goto('/companies');
  const grid = page.locator('ore-datagrid');

  await grid.getByRole('button', { name: 'Filter' }).click();
  await grid.getByRole('combobox', { name: 'Add filter…' }).click();
  await page.getByRole('option', { exact: true, name: 'Open pipeline' }).click();
  const operator = grid.locator('ore-select[label="Open pipeline operator"]');
  await operator.click();
  await page.getByRole('option', { exact: true, name: 'Greater than' }).click();
  await grid.getByRole('combobox', { exact: true, name: 'Open pipeline' }).click();
  await page.getByRole('option', { exact: true, name: '€120,000' }).click();
  await expect(grid.getByText('€133,800', { exact: true }).first()).toBeVisible();
  await expect(grid.getByText('€37,300', { exact: true })).toHaveCount(0);

  await operator.click();
  await page.getByRole('option', { exact: true, name: 'Less than' }).click();
  await expect(grid.getByText('€37,300', { exact: true }).first()).toBeVisible();
  await expect(grid.getByText('€133,800', { exact: true })).toHaveCount(0);
});

test('viewer cannot create or edit records', async ({ page }) => {
  await page.goto('/companies');
  if ((page.viewportSize()?.width ?? 1000) < 600) {
    await page.getByRole('button', { name: 'Open navigation menu' }).click();
    await page.locator('ore-select.mobile-user[label="Demo user"]').click();
  } else {
    await page.locator('ore-select.user-switcher[label="Demo user"]').click();
  }
  await page.getByRole('option', { name: /Guest/ }).click();
  if ((page.viewportSize()?.width ?? 1000) < 600) await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'New company' })).toHaveCount(0);
  await page.getByRole('link', { name: /Acme Corporation/ }).click();
  await expect(page.getByRole('button', { name: 'Edit company' })).toHaveCount(0);
  await page.keyboard.press('Control+K');
  await expect(page.getByLabel('Commands').getByText('Create company', { exact: true })).toHaveCount(0);
  await page.keyboard.press('Escape');

  await page.goto('/');
  await expect(page.getByRole('button', { name: 'New opportunity' })).toHaveCount(0);
  await page.goto('/pipeline');
  await expect(page.getByRole('button', { name: 'New opportunity' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Open Acme Enterprise Contract' }).click();
  await expect(page.locator('crm-record-drawer ore-select[label="Move to stage…"]')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.goto('/activity');
  await expect(page.getByRole('button', { name: /Archive activity/ })).toHaveCount(0);
});

test('network simulation survives navigation', async ({ page }) => {
  await page.goto('/pipeline');
  if ((page.viewportSize()?.width ?? 1000) < 600) {
    await page.getByRole('button', { name: 'Open navigation menu' }).click();
    await page.getByRole('button', { name: 'Simulate offline' }).click();
    await expect(page.getByRole('button', { name: 'Reconnect network' })).toBeVisible();
    await page.getByRole('button', { name: 'Reconnect network' }).click();
  } else {
    await page.getByRole('button', { name: 'Online' }).click();
    await expect(page.getByRole('button', { name: /Offline/ })).toBeVisible();
    await page.getByRole('button', { name: /Offline/ }).click();
    await expect(page.getByRole('button', { name: 'Online' })).toBeVisible();
  }
});
