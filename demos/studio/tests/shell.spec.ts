import { expect, test } from 'playwright/test';

test('the zoom cluster is docked with the board tools and drives the camera', async ({ page }) => {
  await page.goto('/#/board');
  const zoom = page.locator('[data-testid="board-toolbar"] [data-testid="shell-zoom"]');
  await expect(zoom).toBeVisible();
  // The cluster is built by the shell but appended into the scene's bottom
  // dock, where its buttons drive the camera and the label follows.
  await zoom.locator('[data-zoom="in"]').click();
  await expect(page.locator('[data-testid="shell-zoom-label"]')).not.toHaveText('100%');
});

test('scenes without a camera show no zoom cluster', async ({ page }) => {
  await page.goto('/#/palette');
  await expect(page.locator('[data-testid="shell-zoom"]')).toHaveCount(0);
});

test('the theme toggle cycles system → light → dark and persists the choice', async ({ page }) => {
  await page.goto('/#/board');
  const theme = page.locator('[data-testid="shell-theme"]');
  const root = page.locator('html');
  const icon = theme.locator('ore-icon');
  // The runner defaults to a light OS, so "system" resolves to light.
  await expect(root).toHaveClass(/light/);
  await expect(icon).toHaveAttribute('name', 'monitor');

  await theme.click();
  await expect(icon).toHaveAttribute('name', 'sun');
  await expect(root).toHaveClass(/light/);

  await theme.click();
  await expect(icon).toHaveAttribute('name', 'moon');
  await expect(root).toHaveClass(/dark/);

  // The dark choice survives a reload.
  await page.reload();
  await expect(theme).toBeVisible();
  await expect(root).toHaveClass(/dark/);
  await expect(icon).toHaveAttribute('name', 'moon');
});

test('the info badge clears the dock capsule on every scene', async ({ page }) => {
  for (const route of ['board', 'flow', 'map']) {
    await page.goto(`/#/${route}`);
    const badge = page.locator('.studio-badge');
    await expect(badge).toBeVisible();
    const badgeBox = await badge.boundingBox();
    const dockBox = await page.locator('ore-dock').boundingBox();
    expect(badgeBox && dockBox).toBeTruthy();
    // The badge floats above the dock; the dock is content-sized (and wraps on
    // narrow viewports), so a fixed clearance is wrong — the scene publishes
    // --dock-height and the badge must stay fully above the capsule.
    expect(badgeBox!.y + badgeBox!.height).toBeLessThanOrEqual(dockBox!.y);
  }
});
