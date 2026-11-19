import { expect, test } from 'playwright/test';

/**
 * keymap resolves `mod` from navigator.userAgentData.platform, which the pinned
 * Playwright device descriptors report as Windows/Android, so Ctrl is the
 * matching modifier in the runner regardless of the host OS.
 */
const MOD = 'Control';

const status = (page: import('playwright/test').Page) => page.locator('[data-testid="map-status"]');

test.beforeEach(async ({ page }) => {
  await page.goto('/#/map');
  await expect(page.locator('[data-testid="map-root"]')).toBeVisible();
  await expect(page.locator('[data-testid="map-canvas"]')).toBeVisible();
  // The first-run encounter seeds two heroes and three enemies.
  await expect(status(page)).toHaveAttribute('data-units', '5');
});

test('status reports the seeded encounter', async ({ page }) => {
  await expect(status(page)).toContainText('2 heroes · 3 enemies · square grid');
  await expect(status(page)).toHaveAttribute('data-grid', 'square');
});

test('keyboard cursor places a hero and undo removes it again', async ({ page }) => {
  const canvas = page.locator('[data-testid="map-canvas"]');
  await canvas.focus();
  await page.keyboard.press('h');
  await page.keyboard.press('ArrowRight'); // moves the cursor to (0, 0), an empty cell
  await page.keyboard.press('Enter');
  await expect(status(page)).toHaveAttribute('data-units', '6');

  await page.keyboard.press(`${MOD}+z`);
  await expect(status(page)).toHaveAttribute('data-units', '5');

  await page.keyboard.press(`${MOD}+Shift+z`);
  await expect(status(page)).toHaveAttribute('data-units', '6');
});

test('blocker tool paints and erases with undo', async ({ page }) => {
  const canvas = page.locator('[data-testid="map-canvas"]');
  await canvas.focus();
  await page.keyboard.press('b');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  // Undo the paint, then redo it: the unit count is unchanged throughout, so
  // assert via the ledger buttons enabling.
  await expect(page.locator('[data-testid="map-toolbar"] [data-history="undo"]')).toBeEnabled();
  await page.keyboard.press(`${MOD}+z`);
  await expect(page.locator('[data-testid="map-toolbar"] [data-history="redo"]')).toBeEnabled();
});

test('switching the grid shape updates the status and undoes', async ({ page }) => {
  await page.locator('[data-testid="map-grid"] [value="hex"]').click();
  await expect(status(page)).toHaveAttribute('data-grid', 'hex');
  await page.keyboard.press(`${MOD}+z`);
  await expect(status(page)).toHaveAttribute('data-grid', 'square');
});

test('running a turn explains every move and undo reverts it', async ({ page }) => {
  await page.locator('[data-testid="map-turn"]').click();
  const list = page.locator('[data-testid="map-turn-list"]');
  await expect(list).toBeVisible();
  // One entry per unit that acted: three enemies, then the two surviving
  // heroes fight back, each with at least one plain-language reason.
  await expect(list.locator('.map-turn-entry')).toHaveCount(5);
  await expect(list).toContainText(/Targets .*nearest|cannot reach|No heroes/);
  // The turn is one ledger command: undo removes the whole round.
  await page.keyboard.press(`${MOD}+z`);
  await expect(status(page)).toHaveAttribute('data-units', '5');
});

test('an enemy turn kills attacked heroes and a wipeout offers a restart', async ({ page }) => {
  const canvas = page.locator('[data-testid="map-canvas"]');
  await canvas.focus();
  // Erase both seeded heroes: the first arrow parks the cursor at (0,0),
  // then three left and two up reach the Ranger at (-4,-2).
  await page.keyboard.press('x');
  // Restore parks the cursor at (0,0): four lefts and two ups reach (-4,-2).
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowLeft');
  for (let i = 0; i < 2; i++) await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Enter');
  await expect(status(page)).toHaveAttribute('data-units', '4');
  // One left and three down reach the Cleric at (-5,1).
  await page.keyboard.press('ArrowLeft');
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(status(page)).toHaveAttribute('data-units', '3');
  // Place one hero beside the Brute (5,-3): nine rights and four ups land on
  // (4,-3), adjacent to it.
  await page.keyboard.press('h');
  for (let i = 0; i < 9; i++) await page.keyboard.press('ArrowRight');
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Enter');
  await expect(status(page)).toHaveAttribute('data-units', '4');

  await page.locator('[data-testid="map-turn"]').click();
  // The Brute kills the lone hero: the party is gone and the card appears.
  await expect(status(page)).toHaveAttribute('data-units', '3');
  await expect(page.locator('[data-testid="map-turn-kills"]')).toBeVisible();
  await expect(page.locator('[data-testid="map-gameover"]')).toBeVisible();
  // The kill leaves a marker on the map: one unit fell this turn.
  await expect(page.locator('[data-testid="map-root"]')).toHaveAttribute('data-turn-fallen', '1');

  // Restart replays the seed encounter and hides the card.
  await page.locator('[data-testid="map-restart"]').click();
  await expect(page.locator('[data-testid="map-gameover"]')).toBeHidden();
  await expect(status(page)).toHaveAttribute('data-units', '5');
});

test('the dock stays usable while the Turn panel is open', async ({ page }) => {
  await page.locator('[data-testid="map-turn"]').click();
  const panel = page.locator('[data-testid="map-results"]');
  await expect(panel).toBeVisible();
  // The dock is lifted above the modeless panel: its bottom edge clears the
  // panel's top edge. The host spans the viewport, so measure the panel
  // inside the drawer's shadow tree.
  const dockBox = await page.locator('[data-testid="map-toolbar"]').boundingBox();
  const panelBox = await panel.locator('.panel').boundingBox();
  expect(dockBox && panelBox ? dockBox.y + dockBox.height <= panelBox.y + 1 : false).toBe(true);
  // Playwright fails on an intercepted click, so clicking undo proves the
  // panel does not swallow the dock.
  await page.locator('[data-testid="map-toolbar"] [data-history="undo"]').click();
  await expect(status(page)).toHaveAttribute('data-units', '5');
  await expect(panel).toBeVisible();
});

test('retry replays the encounter the user built, not the demo seed', async ({ page }) => {
  const canvas = page.locator('[data-testid="map-canvas"]');
  await canvas.focus();
  // Erase both seeded heroes so the party is a lone target (same route as
  // the wipeout test), leaving a custom 4-unit encounter.
  await page.keyboard.press('x');
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowLeft');
  for (let i = 0; i < 2; i++) await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowLeft');
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(status(page)).toHaveAttribute('data-units', '3');
  // Place one hero beside the Brute: nine rights and four ups.
  await page.keyboard.press('h');
  for (let i = 0; i < 9; i++) await page.keyboard.press('ArrowRight');
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Enter');
  await expect(status(page)).toHaveAttribute('data-units', '4');

  await page.locator('[data-testid="map-turn"]').click();
  await expect(page.locator('[data-testid="map-gameover"]')).toBeVisible();
  // Retry restores the custom 4-unit encounter, not the 5-unit seed.
  await page.locator('[data-testid="map-retry"]').click();
  await expect(page.locator('[data-testid="map-gameover"]')).toBeHidden();
  await expect(status(page)).toHaveAttribute('data-units', '4');
});

test('run turn is the last control in the dock, after the zoom cluster', async ({ page }) => {
  // The shell appends its zoom cluster after the scene's controls, then moves
  // the scene's dockTail past it, and the dock wraps on narrow screens, so
  // assert DOM order rather than geometry: Run turn is the final control.
  const controls = page.locator(
    '[data-testid="map-toolbar"] ore-button:not([data-zoom]), [data-testid="map-toolbar"] ore-switch, [data-testid="map-toolbar"] [data-zoom]',
  );
  await expect(controls.last()).toHaveAttribute('data-action', 'turn');
});

test('selecting a unit opens the inspector with its fields', async ({ page }) => {
  // Keyboard selection reaches the Brute at cell (5,-3) on any viewport size.
  // Restore parks the cursor at (0,0), so five rights and three ups land on it.
  const canvas = page.locator('[data-testid="map-canvas"]');
  await canvas.focus();
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Enter');
  // The drawer host is display: contents, so assert on the open dialog.
  const inspector = page.locator('[data-testid="map-inspector"]');
  await expect(inspector).toHaveAttribute('data-unit', 'enemy-1');
  const form = page.locator('[data-testid="map-inspector-form"]');
  await expect(form).toBeVisible();
  // ore-input wraps a shadow input; Playwright's CSS pierces the shadow root.
  await expect(form.locator('[data-field="name"] input')).toHaveValue('Brute');
});

test('placing an enemy does not open the inspector', async ({ page }) => {
  const canvas = page.locator('[data-testid="map-canvas"]');
  await canvas.focus();
  await page.keyboard.press('e');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await expect(status(page)).toHaveAttribute('data-units', '6');
  // The inspector stays closed so placing several enemies is uninterrupted.
  await expect(page.locator('[data-testid="map-inspector"] dialog')).not.toHaveAttribute('open', '');
});

test('the inspector re-syncs from the model after undo', async ({ page }) => {
  const canvas = page.locator('[data-testid="map-canvas"]');
  await canvas.focus();
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Enter');
  const form = page.locator('[data-testid="map-inspector-form"]');
  await expect(form).toBeVisible();
  // Bump Move with the counter's increment button, then undo the edit. The
  // counter's value is an <output role="spinbutton">, so read aria-valuenow.
  const moveValue = form.locator('[data-field="move"]').getByRole('spinbutton');
  await expect(moveValue).toHaveAttribute('aria-valuenow', '4');
  await form.locator('[data-field="move"]').getByRole('button', { name: 'Increase Move' }).click();
  await expect(moveValue).toHaveAttribute('aria-valuenow', '5');
  await page.keyboard.press(`${MOD}+z`);
  await expect(moveValue).toHaveAttribute('aria-valuenow', '4');
});

test('typing in the inspector does not fire tool hotkeys', async ({ page }) => {
  // Regression: keydown from an ore-input's shadow <input> retargets to the
  // host, so the tool shortcuts must be filtered by the composed path.
  const canvas = page.locator('[data-testid="map-canvas"]');
  await canvas.focus();
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Enter');
  const form = page.locator('[data-testid="map-inspector-form"]');
  await expect(form).toBeVisible();
  const name = form.locator('[data-field="name"]');
  await name.click();
  // 'b' is the paint-blocker hotkey: the keystrokes must land in the field
  // (select-all on focus or after the caret, per platform) and not switch tools.
  await page.keyboard.type('bbb');
  await expect(name.locator('input')).toHaveValue(/bbb/);
  await expect(canvas).toHaveAttribute('data-tool', 'select');
});

test('picking a class from the dropdown keeps the inspector open', async ({ page }) => {
  // Regression: ore-select emits its own bubbling open-change when its
  // dropdown closes; that must not read as the drawer closing.
  const canvas = page.locator('[data-testid="map-canvas"]');
  await canvas.focus();
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Enter');
  const form = page.locator('[data-testid="map-inspector-form"]');
  await expect(form).toBeVisible();
  const select = form.locator('[data-field="catalog"]');
  await select.click();
  await page.getByRole('option', { name: /Skirmisher/ }).click();
  // The drawer stays open and shows the picked class's stats.
  await expect(page.locator('[data-testid="map-inspector"] dialog')).toHaveAttribute('open', '');
  await expect(form.locator('[data-field="move"]').getByRole('spinbutton')).toHaveAttribute('aria-valuenow', '6');
  // Escape with the dropdown open closes only the dropdown; a second Escape
  // closes the drawer.
  await select.click();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-testid="map-inspector"] dialog')).toHaveAttribute('open', '');
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-testid="map-inspector"] dialog')).not.toHaveAttribute('open', '');
});

test('the turn results panel leaves the map interactive', async ({ page }) => {
  await page.locator('[data-testid="map-turn"]').click();
  const list = page.locator('[data-testid="map-turn-list"]');
  await expect(list).toBeVisible();
  // The heroes fight back: the Ranger's reach five kills the Skirmisher that
  // closed on the Cleric, so four units remain.
  await expect(status(page)).toHaveAttribute('data-units', '4');
  // Modeless: the canvas still takes input with the panel open. Eight lefts
  // park the cursor on empty terrain west of the party.
  const canvas = page.locator('[data-testid="map-canvas"]');
  await canvas.focus();
  await page.keyboard.press('h');
  for (let i = 0; i < 8; i++) await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Enter');
  await expect(status(page)).toHaveAttribute('data-units', '5');
});

test('heroes fight back: a victory card offers a restart', async ({ page }) => {
  const canvas = page.locator('[data-testid="map-canvas"]');
  await canvas.focus();
  // Erase the Cleric, the Archer, and the Skirmisher so the Ranger duels the
  // Brute. The cursor starts at (0,0).
  await page.keyboard.press('x');
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter'); // Cleric at (-5,1)
  for (let i = 0; i < 11; i++) await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Enter'); // Archer at (6,0)
  for (let i = 0; i < 2; i++) await page.keyboard.press('ArrowLeft');
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter'); // Skirmisher at (4,3)
  await expect(status(page)).toHaveAttribute('data-units', '2');

  // The Brute closes but its reach one never touches the Ranger; the Ranger's
  // reach five shot kills it, the card flips to Victory, and restart reseeds.
  await page.locator('[data-testid="map-turn"]').click();
  await expect(page.locator('[data-testid="map-turn-kills"]')).toBeVisible();
  await expect(page.locator('[data-testid="map-gameover"]')).toBeVisible();
  await expect(page.locator('[data-testid="map-gameover-title"]')).toHaveText('Victory');
  await expect(status(page)).toHaveAttribute('data-units', '1');

  await page.locator('[data-testid="map-restart"]').click();
  await expect(page.locator('[data-testid="map-gameover"]')).toBeHidden();
  await expect(status(page)).toHaveAttribute('data-units', '5');
});

test('the encounter survives a reload', async ({ page }) => {
  const canvas = page.locator('[data-testid="map-canvas"]');
  await canvas.focus();
  await page.keyboard.press('h');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await expect(status(page)).toHaveAttribute('data-units', '6');
  await page.reload();
  await expect(status(page)).toHaveAttribute('data-units', '6');
});

test('dragging empty terrain pans the camera', async ({ page }) => {
  const root = page.locator('[data-testid="map-root"]');
  const before = (await root.getAttribute('data-camera')) ?? '0.0,0.0';

  const canvas = page.locator('[data-testid="map-canvas"]');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('canvas not visible');
  // Start near the viewport centre (empty terrain at world (150, 150)) so the
  // grab point is on-canvas on phone and desktop viewports alike.
  const startX = box.x + box.width / 2 + 150;
  const startY = box.y + box.height / 2 + 150;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX - 120, startY - 60, { steps: 6 });
  await page.mouse.up();

  await expect(root).not.toHaveAttribute('data-camera', before, { timeout: 2000 });
});

test('export produces a PNG blob download', async ({ page }) => {
  const downloadPromise = page.waitForEvent('download');
  await page.locator('[data-testid="map-toolbar"] [data-action="export"]').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('vielzeug-map.png');
});

test('zooming out stops at the floor so rendering stays bounded', async ({ page }) => {
  const canvas = page.locator('[data-testid="map-canvas"]');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('canvas not visible');
  for (let i = 0; i < 40; i++) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, 1200);
  }
  await expect(page.locator('[data-testid="shell-zoom-label"]')).toHaveText('25%');
  await expect(status(page)).toHaveAttribute('data-mode', 'main', { timeout: 2000 });
});

test.describe('worker render mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.locator('[data-testid="map-thread"] [value="worker"]').click();
    await expect(status(page)).toHaveAttribute('data-mode', 'worker');
  });

  test('worker mode keeps the canvas mounted and status live', async ({ page }) => {
    await expect(page.locator('[data-testid="map-canvas"]')).toBeVisible();
    await expect(status(page)).toHaveAttribute('data-mode', 'worker');
  });

  test('edits sync to the worker twin', async ({ page }) => {
    const canvas = page.locator('[data-testid="map-canvas"]');
    await canvas.focus();
    await page.keyboard.press('h');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await expect(status(page)).toHaveAttribute('data-units', '6');
  });

  test('export round-trips a PNG blob through the worker', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');
    await page.locator('[data-testid="map-toolbar"] [data-action="export"]').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('vielzeug-map.png');
  });

  test('toggling back to main thread rendering works', async ({ page }) => {
    await page.locator('[data-testid="map-thread"] [value="main"]').click();
    await expect(status(page)).toHaveAttribute('data-mode', 'main');
    const downloadPromise = page.waitForEvent('download');
    await page.locator('[data-testid="map-toolbar"] [data-action="export"]').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('vielzeug-map.png');
  });
});
