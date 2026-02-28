/**
 * Craftit - Event Modifiers Tests
 * Tests for event modifier functionality
 */
import { define, html } from '..';
import { mount } from '../testing/render';

describe('Event Modifiers', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  describe('.prevent modifier', () => {
    it('should call preventDefault', async () => {
      const submitSpy = vi.fn();

      define('test-prevent', () => {
        return html`
          <form @submit.prevent=${submitSpy}>
            <button type="submit">Submit</button>
          </form>
        `;
      });

      const { query, waitForUpdates, unmount } = mount('test-prevent');
      await waitForUpdates();

      const form = query('form');
      const event = new Event('submit', { bubbles: true, cancelable: true });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      form?.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(submitSpy).toHaveBeenCalled();

      unmount();
    });
  });

  describe('.stop modifier', () => {
    it('should call stopPropagation', async () => {
      const innerSpy = vi.fn();
      const outerSpy = vi.fn();

      define('test-stop', () => {
        return html`
          <div @click=${outerSpy}>
            <button @click.stop=${innerSpy}>Click</button>
          </div>
        `;
      });

      const { query, waitForUpdates, unmount } = mount('test-stop');
      await waitForUpdates();

      const button = query('button');
      const event = new Event('click', { bubbles: true, cancelable: true });
      const stopPropagationSpy = vi.spyOn(event, 'stopPropagation');

      button?.dispatchEvent(event);

      expect(stopPropagationSpy).toHaveBeenCalled();
      expect(innerSpy).toHaveBeenCalled();
      expect(outerSpy).not.toHaveBeenCalled();

      unmount();
    });
  });

  describe('.once modifier', () => {
    it('should only fire once', async () => {
      const clickSpy = vi.fn();

      define('test-once', () => {
        return html`<button @click.once=${clickSpy}>Click</button>`;
      });

      const { query, waitForUpdates, unmount } = mount('test-once');
      await waitForUpdates();

      const button = query('button') as HTMLButtonElement;

      button?.click();
      button?.click();
      button?.click();

      expect(clickSpy).toHaveBeenCalledTimes(1);

      unmount();
    });
  });

  describe('multiple modifiers', () => {
    it('should apply multiple modifiers', async () => {
      const submitSpy = vi.fn();

      define('test-multiple-modifiers', () => {
        return html`
          <form @submit.prevent.stop=${submitSpy}>
            <button type="submit">Submit</button>
          </form>
        `;
      });

      const { query, waitForUpdates, unmount } = mount('test-multiple-modifiers');
      await waitForUpdates();

      const form = query('form');
      const event = new Event('submit', { bubbles: true, cancelable: true });
      const preventSpy = vi.spyOn(event, 'preventDefault');
      const stopSpy = vi.spyOn(event, 'stopPropagation');

      form?.dispatchEvent(event);

      expect(preventSpy).toHaveBeenCalled();
      expect(stopSpy).toHaveBeenCalled();
      expect(submitSpy).toHaveBeenCalled();

      unmount();
    });
  });

  describe('.self modifier', () => {
    it('should only fire when target is currentTarget', async () => {
      const clickSpy = vi.fn();

      define('test-self', () => {
        return html`
          <div @click.self=${clickSpy}>
            <button>Click</button>
          </div>
        `;
      });

      const { query, waitForUpdates, unmount } = mount('test-self');
      await waitForUpdates();

      const div = query('div');
      const button = query('button') as HTMLButtonElement;

      // Click on button (should not trigger)
      button?.click();
      expect(clickSpy).not.toHaveBeenCalled();

      // Click on div directly
      const event = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(event, 'target', { value: div, configurable: true });
      Object.defineProperty(event, 'currentTarget', { value: div, configurable: true });
      div?.dispatchEvent(event);

      expect(clickSpy).toHaveBeenCalledTimes(1);

      unmount();
    });
  });

  describe('capture modifier', () => {
    it('should use capture phase', async () => {
      const events: string[] = [];

      define('test-capture', () => {
        return html`
          <div @click.capture=${() => events.push('parent-capture')}>
            <button @click=${() => events.push('child')}>Click</button>
          </div>
        `;
      });

      const { query, waitForUpdates, unmount } = mount('test-capture');
      await waitForUpdates();

      const button = query('button') as HTMLButtonElement;
      button?.click();

      // Capture phase runs before bubble phase
      expect(events).toEqual(['parent-capture', 'child']);

      unmount();
    });
  });
});





