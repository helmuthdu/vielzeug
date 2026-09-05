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

test('empty cart offers a route back to models', async ({ page }) => {
  await page.goto('/cart');
  await expect(page.getByRole('button', { name: 'Browse models' })).toBeVisible();
});

test('mobile cart and checkout stay within the viewport', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Mobile layout regression.');
  await page.goto('/models/v500');
  await page.getByRole('button', { name: 'Add to cart (from summary)' }).first().click();
  const cartLine = page.locator('.cart-line');
  await expect(cartLine).toBeVisible();
  const overflow = await cartLine.evaluate((line) => line.scrollWidth - line.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await page.getByRole('button', { name: 'Checkout' }).click();
  await expect(page.locator('.checkout-stepper')).toBeVisible();
  await expect(page.locator('.checkout-progress__current')).toContainText('Shipping');
});

test('orders use the shared Ore stepper', async ({ page }) => {
  await page.goto('/orders');
  await expect(page.locator('order-timeline ore-stepper').first()).toBeVisible();
});
