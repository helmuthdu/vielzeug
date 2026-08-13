/**
 * Real-browser tests for `ore-stepper`/`ore-step` — a11y checks (including color-contrast and
 * target-size, which jsdom can't evaluate) and real click/keyboard interaction. Complements
 * `stepper.test.ts`'s jsdom coverage.
 *
 * Run with: pnpm test:e2e (requires built dist — run pnpm build first)
 */
import { axeCheck, expect, test } from '../../testing/fixtures';

const steps =
  '<ore-step value="cart">Cart</ore-step>' +
  '<ore-step value="shipping">Shipping</ore-step>' +
  '<ore-step value="payment">Payment</ore-step>';

test.describe('Accessibility', () => {
  test('display-only stepper passes a11y checks', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`<ore-stepper value="shipping" color="primary">${steps}</ore-stepper>`);

    const results = await axeCheck(page);

    expect(results.violations).toEqual([]);
  });

  test('clickable stepper passes a11y checks', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`<ore-stepper value="shipping" clickable color="primary">${steps}</ore-stepper>`);

    const results = await axeCheck(page);

    expect(results.violations).toEqual([]);
  });

  test('vertical stepper passes a11y checks', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`<ore-stepper value="shipping" orientation="vertical">${steps}</ore-stepper>`);

    const results = await axeCheck(page);

    expect(results.violations).toEqual([]);
  });
});

test.describe('Interaction', () => {
  test('clicking a navigable step makes it current and updates value', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      `<ore-stepper id="stepper" value="cart" clickable color="primary">${steps}</ore-stepper>`,
    );

    await page.locator('ore-step[value="payment"]').click();
    await page.waitForTimeout(50);

    const value = await page.locator('#stepper').getAttribute('value');

    expect(value).toBe('payment');

    const isCurrent = await page.locator('ore-step[value="payment"]').evaluate((el) => {
      const shadow = (el as HTMLElement & { shadowRoot: ShadowRoot }).shadowRoot;

      return shadow?.querySelector('[aria-current="step"]') !== null;
    });

    expect(isCurrent).toBe(true);

    // Regression: the selection re-render replaces the clicked step's control —
    // focus must be restored onto the new button, not dropped to <body>.
    const paymentHasFocus = await page.evaluate(
      () => document.activeElement === document.querySelector('ore-step[value="payment"]'),
    );

    expect(paymentHasFocus).toBe(true);
  });

  test('a display-only (non-clickable) stepper ignores clicks', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`<ore-stepper id="stepper" value="cart">${steps}</ore-stepper>`);

    await page.locator('ore-step[value="payment"]').click({ force: true });
    await page.waitForTimeout(50);

    const value = await page.locator('#stepper').getAttribute('value');

    expect(value).toBe('cart');
  });

  test('arrow keys move focus and activate the next navigable step', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      `<ore-stepper id="stepper" value="cart" clickable color="primary">${steps}</ore-stepper>`,
    );

    await page.locator('ore-step[value="cart"]').evaluate((el) => {
      const shadow = (el as HTMLElement & { shadowRoot: ShadowRoot }).shadowRoot;

      (shadow.querySelector('button') as HTMLElement)?.focus();
    });
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(50);

    const value = await page.locator('#stepper').getAttribute('value');

    expect(value).toBe('shipping');

    const shippingHasFocus = await page.evaluate(() => {
      const shipping = document.querySelector('ore-step[value="shipping"]');

      return (
        document.activeElement === shipping || document.activeElement?.shadowRoot?.activeElement?.tagName === 'BUTTON'
      );
    });

    expect(shippingHasFocus).toBe(true);
  });

  test('disabled steps are skipped by arrow-key navigation', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-stepper id="stepper" value="cart" clickable color="primary">' +
        '<ore-step value="cart">Cart</ore-step>' +
        '<ore-step value="shipping" disabled>Shipping</ore-step>' +
        '<ore-step value="payment">Payment</ore-step>' +
        '</ore-stepper>',
    );

    await page.locator('ore-step[value="cart"]').evaluate((el) => {
      const shadow = (el as HTMLElement & { shadowRoot: ShadowRoot }).shadowRoot;

      (shadow.querySelector('button') as HTMLElement)?.focus();
    });
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(50);

    const value = await page.locator('#stepper').getAttribute('value');

    expect(value).toBe('payment');
  });
});

test.describe('Layout', () => {
  test('vertical orientation stacks steps top to bottom', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      `<ore-stepper orientation="vertical" value="shipping" color="primary">${steps}</ore-stepper>`,
    );

    const { cartTop, paymentTop, shippingTop } = await page.evaluate(() => ({
      cartTop: document.querySelector('ore-step[value="cart"]')?.getBoundingClientRect().top ?? 0,
      paymentTop: document.querySelector('ore-step[value="payment"]')?.getBoundingClientRect().top ?? 0,
      shippingTop: document.querySelector('ore-step[value="shipping"]')?.getBoundingClientRect().top ?? 0,
    }));

    expect(cartTop).toBeLessThan(shippingTop);
    expect(shippingTop).toBeLessThan(paymentTop);
  });

  test('horizontal orientation lays out steps left to right', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`<ore-stepper value="shipping" color="primary">${steps}</ore-stepper>`);

    const { cartLeft, paymentLeft, shippingLeft } = await page.evaluate(() => ({
      cartLeft: document.querySelector('ore-step[value="cart"]')?.getBoundingClientRect().left ?? 0,
      paymentLeft: document.querySelector('ore-step[value="payment"]')?.getBoundingClientRect().left ?? 0,
      shippingLeft: document.querySelector('ore-step[value="shipping"]')?.getBoundingClientRect().left ?? 0,
    }));

    expect(cartLeft).toBeLessThan(shippingLeft);
    expect(shippingLeft).toBeLessThan(paymentLeft);
  });

  // Regression: long labels/descriptions used to force ore-step's `.control` (flex: 0 0 auto)
  // wider than its allotted share, pushing the whole stepper past its container instead of
  // ellipsizing the label text.
  test('long labels ellipsize instead of overflowing the stepper container', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<div id="container" style="width:400px">' +
        '<ore-stepper id="stepper" value="shipping" color="primary">' +
        '<ore-step value="cart">Cart<span slot="description">A much longer description than usual</span></ore-step>' +
        '<ore-step value="shipping">A very long step label that should not overflow its column</ore-step>' +
        '<ore-step value="payment">Payment</ore-step>' +
        '</ore-stepper>' +
        '</div>',
    );

    const { containerRight, stepperRight } = await page.evaluate(() => ({
      containerRight: document.getElementById('container')?.getBoundingClientRect().right ?? 0,
      stepperRight: document.getElementById('stepper')?.getBoundingClientRect().right ?? 0,
    }));

    expect(stepperRight).toBeLessThanOrEqual(containerRight + 1);
  });

  // Regression: the first step's connector used to stay in the flex layout (`visibility:
  // hidden` still claims flex-grow space, or later, a fixed-length connector still rendered)
  // and shift/pad the first indicator away from the container edge. Each indicator is centered
  // within its own equal-width column by design, so this checks the *first* column's indicator
  // lands at that column's center — not further right because of a phantom leading connector —
  // and that the connector itself is not rendered for the first step at all.
  test('the first step centers its indicator with no phantom leading connector', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      `<div id="container" style="width:399px"><ore-stepper value="cart" color="primary">${steps}</ore-stepper></div>`,
    );

    const { columnWidth, connectorDisplay, containerLeft, indicatorCenter } = await page.evaluate(() => {
      const step = document.querySelector('ore-step[value="cart"]') as HTMLElement & { shadowRoot: ShadowRoot };
      const indicator = step.shadowRoot.querySelector('.indicator');
      const connector = step.shadowRoot.querySelector('.connector');
      const indicatorRect = indicator?.getBoundingClientRect();

      return {
        columnWidth: step.getBoundingClientRect().width,
        connectorDisplay: connector ? getComputedStyle(connector).display : 'none',
        containerLeft: document.getElementById('container')?.getBoundingClientRect().left ?? 0,
        indicatorCenter: indicatorRect ? indicatorRect.left + indicatorRect.width / 2 : 0,
      };
    });

    expect(connectorDisplay).toBe('none');
    expect(Math.abs(indicatorCenter - containerLeft - columnWidth / 2)).toBeLessThan(2);
  });

  // Regression: the horizontal connector used to be a `flex: 1 1 auto` sibling competing with
  // `.control` for leftover row space — once the label was long enough to need most of that
  // space, the connector shrank toward 0 width and effectively disappeared right after the
  // previous step's label instead of visibly bridging the two steps.
  test('horizontal connector stays visible and reaches toward the next step even with long labels', async ({
    page,
    refinePage,
  }) => {
    await refinePage.mountComponent(
      '<div style="width:500px">' +
        '<ore-stepper value="shipping" color="primary">' +
        '<ore-step value="cart">A fairly long first step label</ore-step>' +
        '<ore-step value="shipping">A fairly long second step label</ore-step>' +
        '<ore-step value="payment">Payment</ore-step>' +
        '</ore-stepper>' +
        '</div>',
    );

    const { connectorRight, connectorWidth, indicatorLeft } = await page.evaluate(() => {
      const shippingStep = document.querySelector('ore-step[value="shipping"]') as HTMLElement & {
        shadowRoot: ShadowRoot;
      };
      const connector = shippingStep.shadowRoot.querySelector('.connector');
      const indicator = shippingStep.shadowRoot.querySelector('.indicator');
      const rect = connector?.getBoundingClientRect();

      return {
        connectorRight: rect?.right ?? 0,
        connectorWidth: rect?.width ?? 0,
        indicatorLeft: indicator?.getBoundingClientRect().left ?? 0,
      };
    });

    // A visible, fixed-length line (not collapsed toward 0 by competing with the label)...
    expect(connectorWidth).toBeGreaterThan(8);
    // ...that reaches all the way to (not short of) its own step's indicator.
    expect(connectorRight).toBeGreaterThanOrEqual(indicatorLeft - 1);
  });

  // Regression: `.connector` is `position: absolute`, which paints above normal-flow (static)
  // content regardless of DOM order — including `.control`/`.indicator`, which used to have no
  // `position` of their own. The line ended up drawn on top of every indicator instead of
  // behind it, looking like one line running straight over all the steps.
  test('indicator paints above the connector line instead of the line cutting across it', async ({
    page,
    refinePage,
  }) => {
    await refinePage.mountComponent(`<ore-stepper value="shipping" color="primary">${steps}</ore-stepper>`);

    const topElementIsIndicator = await page.evaluate(() => {
      const shippingStep = document.querySelector('ore-step[value="shipping"]') as HTMLElement & {
        shadowRoot: ShadowRoot;
      };
      const indicator = shippingStep.shadowRoot.querySelector('.indicator') as HTMLElement;
      const rect = indicator.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;

      // `elementFromPoint` doesn't pierce shadow boundaries on its own — it returns the shadow
      // host, so descend manually into each nested shadow root's own `elementFromPoint`.
      let topElement: Element | null = document.elementFromPoint(x, y);

      while (topElement?.shadowRoot) {
        const inner: Element | null = topElement.shadowRoot.elementFromPoint(x, y);

        if (!inner || inner === topElement) break;

        topElement = inner;
      }

      return indicator.contains(topElement) || topElement === indicator;
    });

    expect(topElementIsIndicator).toBe(true);
  });

  // Regression: `ore-step` is its own shadow root, not just a div in a shared tree — a later
  // sibling's positioned `.connector` always paints in front of an earlier sibling's content,
  // regardless of that earlier step's own internal stacking. The connector used to reach all
  // the way to the *previous* step's indicator center, so it visibly overlapped a slice of it.
  test('connector does not visually overlap the previous step indicator', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`<ore-stepper value="shipping" color="primary">${steps}</ore-stepper>`);

    const prevIndicatorCovered = await page.evaluate(() => {
      const cartStep = document.querySelector('ore-step[value="cart"]') as HTMLElement & { shadowRoot: ShadowRoot };
      const indicator = cartStep.shadowRoot.querySelector('.indicator') as HTMLElement;
      const rect = indicator.getBoundingClientRect();
      // Sample just inside the previous indicator's trailing (right) edge — the point most at
      // risk of being painted over by the next step's connector reaching backward.
      const x = rect.right - 2;
      const y = rect.top + rect.height / 2;

      let topElement: Element | null = document.elementFromPoint(x, y);

      while (topElement?.shadowRoot) {
        const inner: Element | null = topElement.shadowRoot.elementFromPoint(x, y);

        if (!inner || inner === topElement) break;

        topElement = inner;
      }

      return topElement !== null && !indicator.contains(topElement) && topElement !== indicator;
    });

    expect(prevIndicatorCovered).toBe(false);
  });

  // Regression: a single connector reaching backward into the previous step's box sat outside
  // `.control`'s own hover background, so hovering a clickable step showed the highlight with a
  // stray bit of line poking out beside it. Each step now draws two halves (leading + trailing)
  // fully inside its own box, so `.control`'s hover background (same box) always covers both.
  test('connector segments stay fully inside their own step, under the hover highlight', async ({
    page,
    refinePage,
  }) => {
    await refinePage.mountComponent(`<ore-stepper value="shipping" clickable color="primary">${steps}</ore-stepper>`);

    const segmentsInsideOwnBox = await page.evaluate(() => {
      const step = document.querySelector('ore-step[value="shipping"]') as HTMLElement & { shadowRoot: ShadowRoot };
      const stepRect = step.getBoundingClientRect();
      const segments = Array.from(step.shadowRoot.querySelectorAll('.connector'));

      return segments.every((segment) => {
        const rect = segment.getBoundingClientRect();

        return rect.left >= stepRect.left - 1 && rect.right <= stepRect.right + 1;
      });
    });

    expect(segmentsInsideOwnBox).toBe(true);
  });

  // Regression: the hover background used `--color-contrast-100` ("cards, elevated surfaces"),
  // which sits so close to the page background that the highlight's rounded edge read as
  // ambiguous — the connector line crossing right at that low-contrast boundary looked like it
  // was escaping the highlight. Asserts real, visible contrast between the hover background and
  // white (not just "some background is present"), matching the design system's own
  // `--color-contrast-200` ("hover states") token.
  test('hover background has enough contrast against the page to read as a solid highlight', async ({
    page,
    refinePage,
  }) => {
    await refinePage.mountComponent(`<ore-stepper value="shipping" clickable color="primary">${steps}</ore-stepper>`);

    await page.hover('ore-step[value="shipping"]');
    await page.waitForTimeout(100);

    const luminanceDelta = await page.evaluate(() => {
      const step = document.querySelector('ore-step[value="shipping"]') as HTMLElement & { shadowRoot: ShadowRoot };
      const control = step.shadowRoot.querySelector('.control') as HTMLElement;
      const bg = getComputedStyle(control).backgroundColor;

      // Computed colors can come back as oklab()/oklch() strings (not plain rgb()) once the
      // theme uses those color spaces — parse via a 1x1 canvas (its fillStyle parser resolves
      // any valid CSS color to real sRGB) instead of assuming an rgb()-shaped string.
      const canvas = document.createElement('canvas');

      canvas.width = 1;
      canvas.height = 1;

      const ctx = canvas.getContext('2d')!;

      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 1, 1);

      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;

      // Simple relative luminance vs. a white page background.
      return 255 - (r + g + b) / 3;
    });

    expect(luminanceDelta).toBeGreaterThan(10);
  });

  // Regression: the vertical connector was drawn as a fixed-length `::after` on the indicator
  // (`--stepper-gap` with a mismatched fallback vs. the real row gap), so it either fell short
  // of or overshot into the next step's indicator.
  test('vertical connector reaches the next step without overlapping its indicator', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      `<ore-stepper orientation="vertical" value="shipping" color="primary">${steps}</ore-stepper>`,
    );

    const { connectorBottom, connectorTop, nextIndicatorTop, prevIndicatorBottom } = await page.evaluate(() => {
      const shippingStep = document.querySelector('ore-step[value="shipping"]') as HTMLElement & {
        shadowRoot: ShadowRoot;
      };
      const cartStep = document.querySelector('ore-step[value="cart"]') as HTMLElement & { shadowRoot: ShadowRoot };
      const connector = shippingStep.shadowRoot.querySelector('.connector');
      const prevIndicator = cartStep.shadowRoot.querySelector('.indicator');
      const nextIndicator = shippingStep.shadowRoot.querySelector('.indicator');

      return {
        connectorBottom: connector?.getBoundingClientRect().bottom ?? 0,
        connectorTop: connector?.getBoundingClientRect().top ?? 0,
        nextIndicatorTop: nextIndicator?.getBoundingClientRect().top ?? 0,
        prevIndicatorBottom: prevIndicator?.getBoundingClientRect().bottom ?? 0,
      };
    });

    // The connector must not extend past its own step's indicator (no overlap)...
    expect(connectorBottom).toBeLessThanOrEqual(nextIndicatorTop + 1);
    // ...and must start close to the previous step's indicator bottom — a few px of breathing
    // room from that step's own control padding is fine, a multi-step-gap-sized break is not.
    expect(connectorTop - prevIndicatorBottom).toBeLessThan(8);
  });

  // Regression: `.indicator` had no `box-sizing: border-box`, so its `border` rendered *on top
  // of* `--step-indicator-size` instead of being included in it — the indicator was actually
  // ~2 * border-width larger per axis than every connector position calc assumed. Horizontal
  // hid it (flexbox centers the indicator regardless of its exact width), but the vertical
  // connector's `left` is computed manually from `--step-indicator-size`, so it landed a few px
  // off the indicator's true horizontal center.
  test('vertical connector is horizontally centered under the indicator', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      `<ore-stepper orientation="vertical" value="shipping" color="primary">${steps}</ore-stepper>`,
    );

    const { connectorCenter, indicatorCenter } = await page.evaluate(() => {
      const shippingStep = document.querySelector('ore-step[value="shipping"]') as HTMLElement & {
        shadowRoot: ShadowRoot;
      };
      const connector = shippingStep.shadowRoot.querySelector('.connector')?.getBoundingClientRect();
      const indicator = shippingStep.shadowRoot.querySelector('.indicator')?.getBoundingClientRect();

      return {
        connectorCenter: connector.left + connector.width / 2,
        indicatorCenter: indicator.left + indicator.width / 2,
      };
    });

    expect(Math.abs(connectorCenter - indicatorCenter)).toBeLessThan(1);
  });

  // Regression: the vertical connector's leading half had a fixed length (just the
  // `padding-block-start` gap), so it only ever reached from a step's own top edge to its own
  // indicator. A step with a description taller than its indicator makes that step's `<li>`
  // taller too — the connector never covered that extra height, leaving a visible break
  // alongside the description text before the line picked up again at the next step.
  test('vertical connector spans the full height even when a step has a tall description', async ({
    page,
    refinePage,
  }) => {
    await refinePage.mountComponent(
      '<div style="width:250px">' +
        '<ore-stepper orientation="vertical" value="shipping" color="primary">' +
        '<ore-step value="cart">Cart' +
        '<span slot="description">A much longer description that wraps onto several lines and makes this step noticeably taller than its own indicator</span>' +
        '</ore-step>' +
        '<ore-step value="shipping">Shipping</ore-step>' +
        '<ore-step value="payment">Payment</ore-step>' +
        '</ore-stepper>' +
        '</div>',
    );

    const { cartIndicatorBottom, gaps, shippingIndicatorTop } = await page.evaluate(() => {
      const cartStep = document.querySelector('ore-step[value="cart"]') as HTMLElement & { shadowRoot: ShadowRoot };
      const shippingStep = document.querySelector('ore-step[value="shipping"]') as HTMLElement & {
        shadowRoot: ShadowRoot;
      };
      const cartTrailing = cartStep.shadowRoot.querySelector('.connector-trailing')?.getBoundingClientRect();
      const shippingLeading = shippingStep.shadowRoot.querySelector('.connector-leading')?.getBoundingClientRect();
      const cartIndicator = cartStep.shadowRoot.querySelector('.indicator')?.getBoundingClientRect();
      const shippingIndicator = shippingStep.shadowRoot.querySelector('.indicator')?.getBoundingClientRect();

      return {
        cartIndicatorBottom: cartIndicator.bottom,
        gaps: {
          betweenSegments: shippingLeading.top - cartTrailing.bottom,
          trailingHeight: cartTrailing.height,
        },
        shippingIndicatorTop: shippingIndicator.top,
      };
    });

    // The trailing half must stretch well past its own indicator (i.e. alongside the long
    // description), not stop at a small fixed length.
    expect(gaps.trailingHeight).toBeGreaterThan(20);
    // The two halves must meet with no visible break between them.
    expect(Math.abs(gaps.betweenSegments)).toBeLessThan(2);
    // Sanity: combined, the segments should span the whole distance between the two indicators.
    expect(shippingIndicatorTop).toBeGreaterThan(cartIndicatorBottom);
  });
});
