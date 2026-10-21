import type { Page } from '@playwright/test';
import { axeCheck, expect, test } from '../../testing/fixtures';

// Headless Chromium ships the Web Speech API but no voices, so the engine is stubbed
// here and speech behavior itself is owned by the jsdom suite's controlled mock. These
// tests exercise the real DOM contract: clicks, keyboard activation, focus, attribute
// reflection, and the full axe scan with contrast and target-size enabled.

const PLAYER = 'ore-speech-player';
const TOGGLE = 'ore-speech-player [part="play"]';
const RATE = 'ore-speech-player [part="rate"]';
const STOP = 'ore-speech-player [part="stop"]';
const POSITION = 'ore-speech-player .position';

test.describe('Rendering', () => {
  test('renders the icon-only toggle, the speed control, and hides stop while idle', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`<${PLAYER} text="The valley sleeps under ash."></${PLAYER}>`);

    await expect(page.locator(TOGGLE)).toBeEnabled();
    await expect(page.locator(TOGGLE)).toHaveAttribute('aria-label', 'Read aloud');
    await expect(page.locator(RATE)).toHaveAttribute('aria-label', 'Reading speed: 1×');
    await expect(page.locator(RATE)).toContainText('1×');
    await expect(page.locator(STOP)).toBeHidden();
  });

  test('disables the controls when the text is empty', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`<${PLAYER} text=""></${PLAYER}>`);

    // ore-button refuses interaction through aria-disabled on its host: the contract
    // the player inherits, and what assistive tech reads.
    await expect(page.locator(TOGGLE)).toHaveAttribute('aria-disabled', 'true');
    await expect(page.locator(RATE)).toHaveAttribute('aria-disabled', 'true');
  });
});

test.describe('Interaction', () => {
  test('toggles to playing, swaps the icon, and reveals the stop control', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`<${PLAYER} text="The valley sleeps under ash."></${PLAYER}>`);
    await stubEngine(page);

    await page.locator(TOGGLE).click();

    await expect(page.locator(PLAYER)).toHaveAttribute('state', 'playing');
    await expect(page.locator(TOGGLE)).toHaveAttribute('aria-label', 'Pause reading');
    // The icon carries the state: the bare idle triangle becomes the pause bars.
    await expect(page.locator(`${TOGGLE} ore-icon`)).toHaveAttribute('name', 'pause');
    await expect(page.locator(STOP)).toBeVisible();
  });

  test('pauses on the second activation and resumes on the third', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`<${PLAYER} text="The valley sleeps under ash."></${PLAYER}>`);
    await stubEngine(page);

    await page.locator(TOGGLE).click();
    await page.locator(TOGGLE).click();

    await expect(page.locator(PLAYER)).toHaveAttribute('state', 'paused');
    await expect(page.locator(TOGGLE)).toHaveAttribute('aria-label', 'Resume reading');

    await page.locator(TOGGLE).click();

    await expect(page.locator(PLAYER)).toHaveAttribute('state', 'playing');
  });

  test('stops and returns to idle from the stop control', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`<${PLAYER} text="The valley sleeps under ash."></${PLAYER}>`);
    await stubEngine(page);

    await page.locator(TOGGLE).click();
    await page.locator(STOP).click();

    await expect(page.locator(PLAYER)).toHaveAttribute('state', 'idle');
    await expect(page.locator(TOGGLE)).toHaveAttribute('aria-label', 'Read aloud');
    await expect(page.locator(STOP)).toBeHidden();
  });

  test('cycles the speed control through its steps', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`<${PLAYER} text="The valley sleeps under ash."></${PLAYER}>`);

    // The first tap from the default speeds the reading up; the slow step returns last.
    await page.locator(RATE).click();
    await expect(page.locator(RATE)).toHaveAttribute('aria-label', 'Reading speed: 1.15×');
    await expect(page.locator(RATE)).toContainText('1.15×');

    await page.locator(RATE).click();
    await expect(page.locator(RATE)).toHaveAttribute('aria-label', 'Reading speed: 1.5×');

    await page.locator(RATE).click();
    await expect(page.locator(RATE)).toHaveAttribute('aria-label', 'Reading speed: 0.85×');
    await expect(page.locator(RATE)).toContainText('0.85×');

    await page.locator(RATE).click();
    await expect(page.locator(RATE)).toHaveAttribute('aria-label', 'Reading speed: 1×');
  });

  test('begins reading from a bound resume-at sentence', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`<${PLAYER} text="First sentence. Second sentence." resume-at="1"></${PLAYER}>`);
    await stubEngine(page);

    const progress: number[] = [];
    await page.exposeFunction('__onProgress', (sentence: number) => progress.push(sentence));
    await page.evaluate(() => {
      document.querySelector('ore-speech-player')?.addEventListener('progress', (event) => {
        const detail = (event as CustomEvent<{ sentence: number }>).detail;
        (window as { __onProgress?: (sentence: number) => void }).__onProgress?.(detail.sentence);
      });
    });

    await page.locator(TOGGLE).click();

    await expect(page.locator(PLAYER)).toHaveAttribute('state', 'playing');
    await expect(progress).toEqual([1]);
  });

  test('activates from the keyboard like a native button', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`<${PLAYER} text="The valley sleeps under ash."></${PLAYER}>`);
    await stubEngine(page);

    await page.locator(TOGGLE).focus();
    await page.keyboard.press('Enter');

    await expect(page.locator(PLAYER)).toHaveAttribute('state', 'playing');
  });

  test('shows the sentence position only while reading', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`<${PLAYER} text="First sentence. Second sentence."></${PLAYER}>`);
    await stubEngine(page);

    await expect(page.locator(POSITION)).toBeHidden();

    await page.locator(TOGGLE).click();

    await expect(page.locator(POSITION)).toBeVisible();
    await expect(page.locator(POSITION)).toHaveText('1 / 2');
  });
});

test.describe('Touch layout', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { height: 844, width: 390 } });

  test('promotes every control to a 44px tap target on coarse pointers', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`<${PLAYER} text="The valley sleeps under ash."></${PLAYER}>`);
    await stubEngine(page);
    await page.locator(TOGGLE).click();

    for (const selector of [TOGGLE, STOP, RATE]) {
      const box = (await page.locator(selector).boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.width).toBeGreaterThanOrEqual(44);
    }
  });
});

test.describe('Accessibility', () => {
  test('passes the full axe scan while idle and while playing', async ({ page, refinePage }) => {
    await refinePage.mountComponent(`<${PLAYER} text="The valley sleeps under ash."></${PLAYER}>`);
    await stubEngine(page);

    expect((await axeCheck(page)).violations).toEqual([]);

    await page.locator(TOGGLE).click();

    expect((await axeCheck(page)).violations).toEqual([]);
  });
});

/** Headless Chromium has no voices: keep the engine quiet without any engine behavior. */
async function stubEngine(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.speechSynthesis.speak = () => {};
    window.speechSynthesis.pause = () => {};
    window.speechSynthesis.resume = () => {};
    window.speechSynthesis.cancel = () => {};
  });
}
