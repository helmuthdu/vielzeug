import type { Page } from '@playwright/test';

import { axeCheck, expect, test, touchSwipe } from '../../testing/fixtures';

const SIZES = {
  lg: { rail: 16, thumb: 24 },
  md: { rail: 12, thumb: 20 },
  sm: { rail: 8, thumb: 16 },
} as const;

test.describe('Visibility', () => {
  test('hidden hides the host', async ({ page, refinePage }) => {
    // `:host { display: inline-flex }` outranks the UA `[hidden]` rule, so the
    // component carries its own `:host([hidden])` rule. This asserts the
    // consumer-visible contract with the full Refine stylesheet loaded.
    await refinePage.mountComponent('<ore-slider hidden data-testid="hidden-slider"></ore-slider>');
    await expect(page.getByTestId('hidden-slider')).toBeHidden();
  });
});

test.describe('Pointer interaction', () => {
  for (const range of [false, true]) {
    for (const reason of ['blur', 'second-touch']) {
      test(`uses the owner document for ${reason} cancellation (range: ${range})`, async ({ page, refinePage }) => {
        await refinePage.mountComponent('<iframe title="Slider owner"></iframe>');
        const values = await page.evaluate(
          async ({ range, reason }) => {
            const ownerDocument = document.querySelector('iframe')!.contentDocument!;
            ownerDocument.defaultView!.customElements.define('ore-slider', customElements.get('ore-slider')!);
            const slider = document.createElement('ore-slider');
            if (range) {
              slider.setAttribute('range', '');
              slider.setAttribute('from', '20');
              slider.setAttribute('to', '80');
            } else slider.setAttribute('value', '20');
            ownerDocument.body.append(slider);
            await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
            const container = slider.shadowRoot!.querySelector('.slider-container')!;
            const track = slider.shadowRoot!.querySelector('.slider-track')!.getBoundingClientRect();
            const value = () => (slider as HTMLElement & { value: string }).value;
            const pointer = (target: EventTarget, type: string, fraction: number, pointerId = 1) =>
              target.dispatchEvent(
                new PointerEvent(type, {
                  bubbles: true,
                  clientX: track.left + track.width * fraction,
                  clientY: track.top + track.height / 2,
                  composed: true,
                  isPrimary: pointerId === 1,
                  pointerId,
                  pointerType: 'touch',
                }),
              );
            pointer(container, 'pointerdown', 0.3);
            const initial = value();
            pointer(document.body, 'pointerdown', 0, 2);
            pointer(container, 'pointermove', 0.4);
            const selected = value();
            if (reason === 'blur') ownerDocument.defaultView!.dispatchEvent(new Event('blur'));
            else pointer(ownerDocument.body, 'pointerdown', 0, 2);
            pointer(container, 'pointermove', 0.6);
            return { after: value(), initial, selected };
          },
          { range, reason },
        );
        expect(values.selected).not.toBe(values.initial);
        expect(values.after).toBe(values.selected);
      });
    }
  }

  test('disabling a range during a captured drag stops further changes', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-slider id="s" range from="20" to="80">Range</ore-slider>');
    const slider = page.locator('#s');
    const track = slider.locator('.slider-track');
    const box = (await track.boundingBox())!;

    await page.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.4, box.y + box.height / 2);
    await slider.evaluate((el) => el.setAttribute('disabled', ''));
    const selected = await slider.evaluate((el) => (el as HTMLElement & { value: string }).value);
    await page.mouse.move(box.x + box.width * 0.7, box.y + box.height / 2);
    await page.mouse.up();
    expect(await slider.evaluate((el) => (el as HTMLElement & { value: string }).value)).toBe(selected);
    await expect(slider).not.toHaveAttribute('data-dragging');
    expect(await slider.locator('.slider-container').evaluate((el) => getComputedStyle(el).touchAction)).toBe(
      'pan-y pinch-zoom',
    );
  });
});

test.describe('Focus', () => {
  // Single-value sliders keep keyboard focus on the host, so the stylesheet
  // suppresses the browser's own `outline: auto` ring. That is only safe while
  // the themed thumb ring still paints: this is the assertion that keeps a
  // focused slider from ending up with no indicator at all (WCAG 2.4.7).
  test('replaces the browser outline with the themed ring on keyboard focus', async ({ page, refinePage }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await refinePage.mountComponent(
      '<button id="tab-start">start</button><ore-slider id="kb" value="30"></ore-slider>',
    );
    await page.waitForSelector('ore-slider');

    await page.locator('#tab-start').focus();
    await page.keyboard.press('Tab');

    const focused = await page.evaluate(() => {
      const host = document.activeElement as HTMLElement;
      const thumb = host.shadowRoot?.querySelector<HTMLElement>('.slider-thumb-sole');
      return {
        host: host.tagName,
        outlineStyle: getComputedStyle(host).outlineStyle,
        ring: thumb ? getComputedStyle(thumb).boxShadow : '',
      };
    });

    expect(focused.host).toBe('ORE-SLIDER');
    expect(focused.outlineStyle).toBe('none');
    expect(focused.ring).toMatch(/0px 0px 0px 4px/);
  });
});

const getSliderGeometry = (page: Page, size: keyof typeof SIZES) =>
  page.locator(`#${size}`).evaluate((slider) => {
    const container = slider.shadowRoot?.querySelector('.slider-container');
    const thumb = slider.shadowRoot?.querySelector('.slider-thumb-sole');
    const track = slider.shadowRoot?.querySelector('.slider-track');

    if (!container || !thumb || !track) throw new Error('Slider geometry is unavailable');

    return {
      interactionHeight: container.getBoundingClientRect().height,
      thumbHeight: thumb.getBoundingClientRect().height,
      trackHeight: track.getBoundingClientRect().height,
    };
  });

test.describe('Layout', () => {
  for (const [size, expected] of Object.entries(SIZES) as [keyof typeof SIZES, (typeof SIZES)[keyof typeof SIZES]][]) {
    test(`${size} uses the compact visual scale`, async ({ page, refinePage }) => {
      await refinePage.mountComponent(`<ore-slider id="${size}" size="${size}" value="50">Volume</ore-slider>`);

      const dimensions = await getSliderGeometry(page, size);

      expect(dimensions.interactionHeight).toBeGreaterThanOrEqual(44);
      expect(dimensions.thumbHeight).toBe(expected.thumb);
      expect(dimensions.trackHeight).toBe(expected.rail);
    });
  }

  test('keeps endpoint thumbs within the control and fills to the logical rail end', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`
      <ore-slider id="minimum" value="0">Minimum</ore-slider>
      <ore-slider id="maximum" value="100">Maximum</ore-slider>
    `);

    const bounds = await page.locator('ore-slider').evaluateAll((sliders) =>
      sliders.map((slider) => {
        const container = slider.shadowRoot?.querySelector('.slider-container');
        const fill = slider.shadowRoot?.querySelector('.slider-fill');
        const track = slider.shadowRoot?.querySelector('.slider-track');
        const thumb = slider.shadowRoot?.querySelector('.slider-thumb-sole');

        if (!container || !fill || !track || !thumb) throw new Error('Slider geometry is unavailable');

        const containerRect = container.getBoundingClientRect();
        const fillRect = fill.getBoundingClientRect();
        const trackRect = track.getBoundingClientRect();
        const thumbRect = thumb.getBoundingClientRect();

        return {
          containerLeft: containerRect.left,
          containerRight: containerRect.right,
          fillRight: fillRect.right,
          thumbLeft: thumbRect.left,
          thumbRight: thumbRect.right,
          trackLeft: trackRect.left,
          trackRight: trackRect.right,
        };
      }),
    );

    for (const slider of bounds) {
      expect(slider.thumbLeft).toBeGreaterThanOrEqual(slider.containerLeft);
      expect(slider.thumbRight).toBeLessThanOrEqual(slider.containerRight);
    }

    expect(bounds[0].thumbLeft).toBeCloseTo(bounds[0].trackLeft - SIZES.md.thumb / 2, 3);
    expect(bounds[1].fillRight).toBeCloseTo(bounds[1].trackRight, 3);
    expect(bounds[1].thumbRight).toBeCloseTo(bounds[1].trackRight + SIZES.md.thumb / 2, 3);
  });

  test('keeps the track usable when a long label cannot share the line', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`
      <ore-slider id="long" value="50" style="width: 220px">Temperature (0-200 C) extended label</ore-slider>
    `);

    const geometry = await page.locator('#long').evaluate((slider) => {
      const container = slider.shadowRoot?.querySelector('.slider-container');
      const label = slider.shadowRoot?.querySelector('.label');

      if (!container || !label) throw new Error('Slider geometry is unavailable');

      const containerRect = container.getBoundingClientRect();
      const labelRect = label.getBoundingClientRect();

      return {
        labelBelow: labelRect.top >= containerRect.bottom - 1,
        trackWidth: containerRect.width,
      };
    });

    // Before the flex-basis fix the nowrap label sized the shrink-to-fit host and
    // starved the track to near zero; it must keep at least a usable width instead.
    expect(geometry.trackWidth).toBeGreaterThanOrEqual(120);
    expect(geometry.labelBelow).toBe(true);
  });

  test('keeps label and track on one line when the host is wide', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`
      <ore-slider id="wide" value="50" style="width: 640px">Volume</ore-slider>
    `);

    const geometry = await page.locator('#wide').evaluate((slider) => {
      const container = slider.shadowRoot?.querySelector('.slider-container');
      const label = slider.shadowRoot?.querySelector('.label');

      if (!container || !label) throw new Error('Slider geometry is unavailable');

      const containerRect = container.getBoundingClientRect();
      const labelRect = label.getBoundingClientRect();

      return {
        sameLine: labelRect.top < containerRect.bottom - 1,
        trackWidth: containerRect.width,
      };
    });

    expect(geometry.sameLine).toBe(true);
    expect(geometry.trackWidth).toBeGreaterThan(400);
  });
});

test.describe('Touch layout', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { height: 844, width: 390 } });

  test('allows native vertical scrolling from the slider', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<div id="scroll" style="height:200px;overflow:auto"><div style="height:100px"></div><ore-slider id="s">Value</ore-slider><div style="height:800px"></div></div>',
    );
    const box = (await page.locator('#s .slider-container').boundingBox())!;
    await touchSwipe(page, {
      from: { x: box.x + box.width / 2, y: box.y + box.height / 2 },
      to: { x: box.x + box.width / 2, y: box.y - 80 },
    });
    await expect.poll(() => page.locator('#scroll').evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  });

  for (const [size, expected] of Object.entries(SIZES) as [keyof typeof SIZES, (typeof SIZES)[keyof typeof SIZES]][]) {
    test(`${size} preserves the visual scale`, async ({ page, refinePage }) => {
      await refinePage.mountComponent(`<ore-slider id="${size}" size="${size}" value="50">Volume</ore-slider>`);

      const dimensions = await getSliderGeometry(page, size);

      expect(dimensions.interactionHeight).toBeGreaterThanOrEqual(44);
      expect(dimensions.thumbHeight).toBe(expected.thumb);
      expect(dimensions.trackHeight).toBe(expected.rail);
    });
  }
});

test.describe('Accessibility', () => {
  test('passes axe checks', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-slider value="50">Volume</ore-slider>');

    const results = await axeCheck(page);

    expect(results.violations).toEqual([]);
  });
});
