import { expect, test } from 'playwright/test';

/** See board.spec.ts: the runner resolves `mod` to Control on the pinned descriptors. */
const MOD = 'Control';

/** Centre of an element (ports/nodes are DOM, so tests stay zoom-independent). */
async function centerOf(locator: import('playwright/test').Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error('element not visible');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

function port(page: import('playwright/test').Page, nodeIndex: number, portId: string) {
  return page.locator('[data-testid="flow-world"] [data-node-id]').nth(nodeIndex).locator(`[data-port-id="${portId}"]`);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/#/flow');
  await expect(page.locator('[data-testid="flow-viewport"]')).toBeVisible();
});

test('seeds a four-node graph with routed edges and a topological order', async ({ page }) => {
  await expect(page.locator('[data-testid="flow-world"] [data-node-id]')).toHaveCount(4);
  await expect(page.locator('[data-testid="flow-edges"] .flow-edge:not(.flow-edge-temp)')).toHaveCount(4);
  await expect(page.locator('[data-testid="flow-status"]')).toHaveText(/Topological order: Input →/);
});

test('dragging a node moves it and undo restores it', async ({ page }) => {
  const node = page.locator('[data-testid="flow-world"] [data-node-id]').nth(1);
  const before = await node.boundingBox();
  const from = await centerOf(node);

  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x, from.y + 120, { steps: 6 });
  await page.mouse.up();
  await expect
    .poll(async () => (await node.boundingBox())?.y ?? 0, { message: 'node moved down' })
    .toBeGreaterThan((before?.y ?? 0) + 60);

  await page.keyboard.press(`${MOD}+z`);
  await expect
    .poll(async () => (await node.boundingBox())?.y ?? 0, { message: 'undo restored' })
    .toBeCloseTo(before?.y ?? 0, 0);
});

test('dragging from a port to another node connects them', async ({ page }) => {
  const edges = page.locator('[data-testid="flow-edges"] .flow-edge:not(.flow-edge-temp)');
  await expect(edges).toHaveCount(4);

  // Out port of "Input" (node 0) to in port of "Output" (node 3).
  const out = await centerOf(port(page, 0, 'out'));
  const inn = await centerOf(port(page, 3, 'in'));

  await page.mouse.move(out.x, out.y);
  await page.mouse.down();
  await page.mouse.move(inn.x, inn.y, { steps: 8 });
  await page.mouse.up();

  await expect(edges).toHaveCount(5);

  await page.keyboard.press(`${MOD}+z`);
  await expect(edges).toHaveCount(4);
});

test('releasing a wire anywhere over another node connects it', async ({ page }) => {
  const edges = page.locator('[data-testid="flow-edges"] .flow-edge:not(.flow-edge-temp)');
  await expect(edges).toHaveCount(4);

  // Out port of "Input" (node 0) dropped on the middle of "Output" (node 3).
  const out = await centerOf(port(page, 0, 'out'));
  const body = await centerOf(page.locator('[data-testid="flow-world"] [data-node-id]').nth(3));

  await page.mouse.move(out.x, out.y);
  await page.mouse.down();
  await page.mouse.move(body.x, body.y, { steps: 8 });
  await page.mouse.up();

  await expect(edges).toHaveCount(5);

  // Dropped on the target's out-port dot (the only visible target on that side).
  const out3 = await centerOf(port(page, 3, 'out'));
  const out1 = await centerOf(port(page, 1, 'out'));
  await page.mouse.move(out1.x, out1.y);
  await page.mouse.down();
  await page.mouse.move(out3.x, out3.y, { steps: 8 });
  await page.mouse.up();

  await expect(edges).toHaveCount(6);
});

test('a wire pulled from an in-port connects backwards, keeping out to in flow', async ({ page }) => {
  const edges = page.locator('[data-testid="flow-edges"] .flow-edge:not(.flow-edge-temp)');
  await expect(edges).toHaveCount(4);

  // Grab "Output".in (node 3) and release over "Input" (node 0): edge is Input -> Output.
  const inn = await centerOf(port(page, 3, 'in'));
  const target = await centerOf(page.locator('[data-testid="flow-world"] [data-node-id]').nth(0));

  await page.mouse.move(inn.x, inn.y);
  await page.mouse.down();
  await page.mouse.move(target.x, target.y, { steps: 8 });
  await page.mouse.up();

  await expect(edges).toHaveCount(5);
  await expect(page.locator('[data-testid="flow-status"]')).toHaveText(/Topological order/);
});

test('a cycle is detected, highlighted, and reported', async ({ page }) => {
  const status = page.locator('[data-testid="flow-status"]');
  await expect(status).toHaveAttribute('data-state', 'ok');

  // Close a cycle: Output.out -> Input.in.
  const out = await centerOf(port(page, 3, 'out'));
  const inn = await centerOf(port(page, 0, 'in'));
  await page.mouse.move(out.x, out.y);
  await page.mouse.down();
  await page.mouse.move(inn.x, inn.y, { steps: 8 });
  await page.mouse.up();

  await expect(status).toHaveAttribute('data-state', 'cycle');
  await expect(page.locator('.flow-edge-cyclic').first()).toBeVisible();
  await expect(page.locator('.flow-node-cyclic').first()).toBeVisible();
});

test('orthogonal routing toggles and keeps every edge visible', async ({ page }) => {
  const edges = page.locator('[data-testid="flow-edges"] .flow-edge:not(.flow-edge-temp)');
  const bezierD = await edges.first().getAttribute('d');
  if (bezierD === null) throw new Error('Expected the curved edge to have a path.');

  await page.keyboard.press('o');
  await expect(page.locator('[data-testid="flow-routing"]')).toHaveAttribute('value', 'orthogonal');
  const orthoD = await edges.first().getAttribute('d');
  expect(orthoD).toMatch(/^M [\d.-]+ [\d.-]+ L/);
  expect(orthoD).not.toBe(bezierD);

  await page.keyboard.press('o');
  await expect(page.locator('[data-testid="flow-routing"]')).toHaveAttribute('value', 'curved');
  await expect(edges.first()).toHaveAttribute('d', bezierD);
});

test('add node and delete selection round-trip through undo', async ({ page }) => {
  const nodes = page.locator('[data-testid="flow-world"] [data-node-id]');
  await expect(nodes).toHaveCount(4);

  await page.keyboard.press('n');
  await expect(nodes).toHaveCount(5);

  await page.keyboard.press('Delete');
  await expect(nodes).toHaveCount(4);

  await page.keyboard.press(`${MOD}+z`);
  await expect(nodes).toHaveCount(5);
});

test('clicking a wire selects it and Backspace deletes it', async ({ page }) => {
  // Click the midpoint of the first wire's visible path.
  const edges = page.locator('[data-testid="flow-edges"] .flow-edge:not(.flow-edge-temp)');
  const before = await edges.count();

  const point = await edges.first().evaluate((el) => {
    const path = el as unknown as SVGPathElement;
    const p = path.getPointAtLength(path.getTotalLength() / 2);
    const ctm = path.getScreenCTM();
    if (!ctm) throw new Error('no screen CTM');
    return { x: ctm.a * p.x + ctm.c * p.y + ctm.e, y: ctm.b * p.x + ctm.d * p.y + ctm.f };
  });
  await page.mouse.click(point.x, point.y);

  await expect(page.locator('[data-testid="flow-toolbar"] [data-action="delete"]')).toBeEnabled();
  await page.keyboard.press('Backspace');
  await expect(edges).toHaveCount(before - 1);

  await page.keyboard.press(`${MOD}+z`);
  await expect(edges).toHaveCount(before);
});

test('graph edits survive a reload and the reset button restores the seed', async ({ page }) => {
  const nodes = page.locator('[data-testid="flow-world"] [data-node-id]');
  await expect(nodes).toHaveCount(4);

  // Delete a node, then reload: the smaller graph must come back.
  const from = await centerOf(nodes.nth(1));
  await page.mouse.click(from.x, from.y);
  await page.keyboard.press('Delete');
  await expect(nodes).toHaveCount(3);
  await expect(page.locator('[data-testid="flow-edges"] .flow-edge:not(.flow-edge-temp)')).toHaveCount(2);

  await page.reload();
  await expect(page.locator('[data-testid="flow-viewport"]')).toBeVisible();
  await expect(nodes).toHaveCount(3);
  await expect(page.locator('[data-testid="flow-edges"] .flow-edge:not(.flow-edge-temp)')).toHaveCount(2);

  // Reset restores the seeded graph and persists that too.
  await page.locator('[data-testid="flow-toolbar"] [data-action="reset"]').click();
  await expect(nodes).toHaveCount(4);

  await page.reload();
  await expect(page.locator('[data-testid="flow-viewport"]')).toBeVisible();
  await expect(nodes).toHaveCount(4);
});
