import { expect, test } from 'playwright/test';

test('catalog exposes accessible actions, navigation, and route titles', async ({ page }) => {
  await page.goto('/catalog');
  const compare = page.getByRole('button', { name: /Compare: Vielzeug V500/ });
  await expect(compare).toBeVisible();
  await expect(compare).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.catalog__hero-media ore-skeleton')).toBeVisible();
  const catalogGeometry = await page.locator('.catalog').evaluate((catalog) => {
    const hero = catalog.querySelector('.catalog__hero')!.getBoundingClientRect();
    const rail = catalog.querySelector('.catalog__search-rail')!.getBoundingClientRect();
    return { heroTop: hero.top, railBottom: rail.bottom };
  });
  expect(catalogGeometry.heroTop).toBeGreaterThanOrEqual(catalogGeometry.railBottom);
  const actionTops = await page
    .locator('.catalog__hero-actions > ore-button')
    .evaluateAll((actions) => actions.map((action) => action.getBoundingClientRect().top));
  expect(new Set(actionTops).size).toBe(1);
  await expect(page).toHaveTitle('Models · Vielzeug Motors');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
});

test('command search reopens after being dismissed', async ({ page }) => {
  await page.goto('/catalog');
  const palette = page.locator('ore-command-palette');
  const search = page.getByRole('button', { name: 'Search' });

  await search.click();
  await expect(palette).toHaveAttribute('open', '');
  await page.keyboard.press('Escape');
  await expect(palette).not.toHaveAttribute('open');
  await search.click();
  await expect(palette).toHaveAttribute('open', '');
});

test('filtered URLs keep refinements collapsed until requested', async ({ page }) => {
  await page.goto('/catalog?powertrain=electric');
  await expect(page.getByRole('button', { name: 'Filters (1)' })).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#catalog-filter-panel')).toHaveCount(0);
});

test('facet counts reflect the current cross-filter context', async ({ page }) => {
  await page.goto('/catalog');
  await page.getByRole('checkbox', { name: 'SUV' }).click();
  await page.getByRole('button', { name: 'Filters (1)' }).click();
  await expect(page.getByRole('checkbox', { name: 'Electric (0)' })).toBeDisabled();
  await expect(page.getByRole('checkbox', { name: 'Hybrid (0)' })).toBeDisabled();
  await expect(page.getByRole('checkbox', { name: 'Petrol (2)' })).toBeEnabled();
});

test('search stays distinct from refinements without layout overlap', async ({ page }) => {
  await page.goto('/catalog');
  const opening = page.locator('.catalog__opening');
  const railOffset = () =>
    opening.evaluate((element) => {
      const openingRect = element.getBoundingClientRect();
      return element.querySelector('.catalog__search-rail')!.getBoundingClientRect().top - openingRect.top;
    });
  const initialRailOffset = await railOffset();

  await page.getByRole('textbox', { name: 'Search models' }).fill('electric');
  await expect(page.locator('.catalog__hero')).toHaveCount(0);
  expect(await railOffset()).toBe(initialRailOffset);
  await expect(page.getByRole('button', { exact: true, name: 'Filters' })).toBeVisible();
  await expect(page.locator('.catalog__active-filters')).toHaveCount(0);
  await expect(page.locator('.catalog__search-meta')).toContainText('1 vehicle · Sorted by relevance');
  await expect(page.locator('.catalog__search').getByRole('button')).toHaveCount(1);
  await expect(page.locator('.catalog__relevance-sort')).toContainText('Relevance');
  await expect(page.getByRole('combobox', { name: 'Sort by' })).toHaveCount(0);
  expect(
    await page
      .locator('.catalog__search-rail')
      .evaluate((rail) => getComputedStyle(rail.shadowRoot!.querySelector('[part="box"]')!).borderRadius),
  ).not.toBe('0px');

  const geometry = await page.locator('.catalog__discovery').evaluate((discovery) => {
    const rail = discovery.querySelector('.catalog__search-rail')!.getBoundingClientRect();
    const quick = discovery.querySelector('.catalog__popular-filters')!.getBoundingClientRect();
    return { quickTop: quick.top, railBottom: rail.bottom };
  });
  expect(geometry.quickTop).toBeGreaterThanOrEqual(geometry.railBottom);

  await page.getByRole('checkbox', { name: 'Electric' }).click();
  await expect(page.getByRole('button', { name: 'Filters (1)' })).toBeVisible();
  await expect(page.locator('.catalog__filter-toggle ore-badge')).toHaveText('1');
  await expect(page.locator('.catalog__active-filters')).toContainText('Electric');

  await page.getByRole('textbox', { name: 'Search models' }).fill('');
  await page.getByRole('checkbox', { name: 'SUV' }).click();
  await expect(page.locator('.catalog__empty')).toContainText('No vehicles match the selected filters.');
});

test('compare navigation opens the dedicated selection flow', async ({ page }, testInfo) => {
  await page.goto('/catalog');
  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Open navigation menu' }).click();
  }
  await page.locator('ore-navbar-item').filter({ hasText: 'Compare', visible: true }).click();
  await expect(page).toHaveURL(/\/compare/);
  await expect(page.getByRole('heading', { name: 'Choose models to compare' })).toBeVisible();
  await page.getByRole('button', { name: 'Choose models' }).click();
  await expect(page).toHaveURL(/\/catalog/);
});

test('comparison route preserves selection and exposes an aligned matrix', async ({ page }) => {
  await page.goto('/catalog');
  await page.getByRole('button', { name: 'Compare: Vielzeug V500' }).click();
  await page
    .locator('model-card')
    .filter({ hasText: 'Vielzeug A200' })
    .getByRole('button', { name: 'Compare' })
    .click();
  await page.goto('/compare');

  await expect(page).toHaveURL(/\/compare\?models=/);
  await expect(page.getByRole('table')).toBeVisible();
  await expect(page.getByRole('columnheader', { name: /Vielzeug V500/ })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: /Vielzeug A200/ })).toBeVisible();
  await page.getByRole('switch', { name: 'Hide identical rows' }).click();
  await expect(page.getByText('5 specifications visible')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('columnheader', { name: /Vielzeug V500/ })).toBeVisible();
});

test('mobile comparison preserves horizontal row alignment', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Mobile comparison regression.');
  await page.goto('/compare?models=v500,a200,x300');
  const overflow = await page.locator('.compare-matrix').evaluate((matrix) => matrix.scrollWidth - matrix.clientWidth);
  expect(overflow).toBeGreaterThan(0);
  await expect(page.getByRole('rowheader', { name: 'Starting price' })).toBeVisible();
});

test('empty cart offers a route back to models', async ({ page }) => {
  await page.goto('/cart');
  await expect(page.getByRole('button', { name: 'Browse models' })).toBeVisible();
});

test('cart applies discounts, persists them, and supports removal recovery', async ({ page }) => {
  await page.goto('/models/v500');
  await page.getByRole('button', { exact: true, name: 'Add to cart' }).click();
  await expect(page.getByRole('region', { name: 'Configured vehicles' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Remove Vielzeug V500' })).toBeVisible();
  await expect(page.getByRole('spinbutton', { name: 'Quantity: Vielzeug V500' })).toBeVisible();

  await page.getByRole('textbox', { name: 'Promo code' }).fill('VIELZEUG-1234');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.locator('.cart-summary__discount').first()).toContainText('Discount');
  await expect(page.locator('.cart-summary__prices')).toContainText('$92,243');
  await page.reload();
  await expect(page.locator('.cart-promo__applied')).toContainText('VIELZEUG-1234');

  await page.getByRole('button', { name: 'Remove Vielzeug V500' }).click();
  await expect(page.getByRole('heading', { name: 'Your cart is empty.' })).toBeVisible();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByRole('heading', { name: 'Vielzeug V500' })).toBeVisible();
  await expect(page.locator('.cart-promo__applied')).toContainText('VIELZEUG-1234');
});

test('cart explains when the active persona cannot check out', async ({ page }) => {
  await page.goto('/settings');
  await page.getByRole('radio', { name: /Liam Ferreira/ }).click();
  await page.goto('/models/v500');
  await page.getByRole('button', { exact: true, name: 'Add to cart' }).click();
  await expect(page.getByText('This demo persona can review carts but cannot place orders.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Switch demo persona' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Checkout' })).toHaveCount(0);
});

test('settings expose named controls and immediate preference state', async ({ page }) => {
  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Language' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Currency' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Light' })).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: 'Custom color' }).click();
  await expect(page.getByRole('slider', { name: 'Custom color' })).toBeVisible();

  const salesPersona = page.getByRole('radio', { name: /Liam Ferreira/ });
  await salesPersona.click();
  await expect(salesPersona).toHaveAttribute('aria-checked', 'true');
  await page.reload();
  await expect(page.getByRole('radio', { name: /Liam Ferreira/ })).toHaveAttribute('aria-checked', 'true');

  await page.getByRole('button', { name: 'Reset preferences' }).click();
  await expect(page.getByRole('button', { name: 'Light' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('status')).toContainText('Saved');
});

test('mobile settings stack descriptions and controls without overflow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Mobile layout regression.');
  await page.goto('/settings');

  const layouts = await page.locator('.settings-field:has(ore-select)').evaluateAll((fields) =>
    fields.map((field) => {
      const copy = field.querySelector('.settings-field__identity')!.getBoundingClientRect();
      const control = field.querySelector('ore-select')!.getBoundingClientRect();
      return { controlTop: control.top, copyBottom: copy.bottom, overflow: field.scrollWidth - field.clientWidth };
    }),
  );
  expect(layouts.every(({ controlTop, copyBottom, overflow }) => controlTop >= copyBottom && overflow <= 0)).toBe(true);
});

test('mobile cart and checkout stay within the viewport', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Mobile layout regression.');
  await page.goto('/models/v500');
  await page.getByRole('button', { exact: true, name: 'Add to cart' }).click();
  const cartLine = page.locator('.cart-line');
  await expect(cartLine).toBeVisible();
  const overflow = await cartLine.evaluate((line) => line.scrollWidth - line.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await page.getByRole('button', { name: 'Checkout' }).click();
  await expect(page.locator('.checkout-stepper')).toBeVisible();
  await expect(page.locator('.checkout-progress__current')).toContainText('Shipping');
});

test('orders expose selectable scopes and an accurate lifecycle', async ({ page }) => {
  await page.goto('/settings');
  await page.getByRole('radio', { name: /Amara Okonkwo/ }).click();
  await page.goto('/orders');

  const stepper = page.locator('order-timeline ore-stepper');
  await expect(stepper).toHaveAttribute('value', 'in-transit');
  await expect(page.getByRole('button', { name: 'Cancel' })).toHaveCount(0);

  await page.getByRole('tab', { name: /Past 1/ }).click();
  await expect(page.getByRole('heading', { name: 'Vielzeug A200' })).toBeVisible();
  await expect(stepper).toHaveAttribute('value', 'delivered');
  await expect(page.getByRole('button', { name: 'Cancel' })).toHaveCount(0);

  await page.getByRole('tab', { name: /All 3/ }).click();
  await page.getByRole('searchbox', { name: 'Search order number or vehicle' }).fill('R350');
  await expect(page.getByRole('button', { name: /Vielzeug R350/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Vielzeug X600 AS/ })).toHaveCount(0);
});
