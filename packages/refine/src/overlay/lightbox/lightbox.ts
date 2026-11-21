import { restoreFocus } from '@vielzeug/focus';
import { createKeymap } from '@vielzeug/keymap';
import {
  define,
  each,
  getHost,
  html,
  onCleanup,
  onEvent,
  onMounted,
  prop,
  ref,
  useEmit,
  watchEffect,
} from '@vielzeug/ore';
import { computed, signal, watch } from '@vielzeug/ripple';
import { warn } from '../../_dev';
import type { OverlayOpenChangeDetail } from '../../core';
import { useDialogControl } from '../shared/use-dialog';
import styles from './lightbox.css?inline';

export { ICON_TAG } from '../../content/icon/icon';
export { SKELETON_TAG } from '../../feedback/skeleton/skeleton';

export type OreLightboxEvents = {
  change: { alt: string; count: number; index: number; src: string };
  'open-change': OverlayOpenChangeDetail;
};

/** Properties of a single-image preview or image gallery. */
export type OreLightboxProps = {
  /** Accessible name of the close button. */
  'close-label'?: string;
  /** Message when an image fails to load. */
  'error-label'?: string;
  /** Accessible dialog name. */
  label?: string;
  /** Message while the image loads. */
  'loading-label'?: string;
  /** Maximum number of thumbnails shown at once. */
  'max-thumbnails'?: number;
  /** Accessible name of the next button. */
  'next-label'?: string;
  /** Position message with `{current}` and `{total}` placeholders. */
  'position-label'?: string;
  /** Accessible name of the previous button. */
  'previous-label'?: string;
};

type ImageItem = { alt: string; key: number; src: string; thumbnailSrc: string; trigger: HTMLButtonElement };

/**
 * A native-modal image preview. Direct child buttons containing images form a gallery.
 *
 * @element ore-lightbox
 * @attr {string} label - Accessible dialog name
 * @attr {string} close-label - Close button label
 * @attr {string} previous-label - Previous image button label
 * @attr {string} next-label - Next image button label
 * @attr {string} loading-label - Image loading message
 * @attr {number} max-thumbnails - Maximum thumbnail buttons in the moving window (default 5)
 * @attr {string} error-label - Image load failure message
 * @attr {string} position-label - Position message with {current} and {total} placeholders
 * @fires open-change - Dialog state changed: detail `{ open, reason }`
 * @fires change - Image changed: detail `{ index, count, src, alt }`
 * @slot - Direct child buttons with an image and optional `data-preview-src`
 * @part dialog - Native modal dialog
 * @part image - Preview image
 * @part close - Close button
 * @part previous - Previous image button
 * @part next - Next image button
 * @part thumbnails - Scrollable thumbnail strip
 * @part thumbnail - Thumbnail navigation button
 * @part status - Position, loading, or error message
 * @cssprop --lightbox-bg - Dialog background
 * @cssprop --lightbox-backdrop - Backdrop color
 * @example
 * ```html
 * <ore-lightbox label="Product photos">
 *   <button type="button" data-preview-src="/full/front.jpg"><img src="/thumb/front.jpg" alt="Front view"></button>
 * </ore-lightbox>
 * ```
 */
export const LIGHTBOX_TAG = 'ore-lightbox' as const;

define<OreLightboxProps>(LIGHTBOX_TAG, {
  props: {
    'close-label': prop.string('Close preview'),
    'error-label': prop.string('Image could not be loaded.'),
    label: prop.string('Image preview'),
    'loading-label': prop.string('Loading image'),
    'max-thumbnails': {
      default: 5,
      parse: (value: string | null) => (value === null ? 5 : Number(value)),
      reflect: true,
    },
    'next-label': prop.string('Next image'),
    'position-label': prop.string('{current} of {total}'),
    'previous-label': prop.string('Previous image'),
  },
  setup(props) {
    const host = getHost();
    const emit = useEmit<OreLightboxEvents>();
    const dialog = ref<HTMLDialogElement>();
    const thumbnails = ref<HTMLElement>();
    const thumbnailItems = signal<ImageItem[]>([]);
    const current = signal<ImageItem | null>(null);
    const index = signal(0);
    const count = signal(0);
    const loadState = signal<'error' | 'loaded' | 'loading'>('loading');
    let items: ImageItem[] = [];
    let generation = 0;
    let validationFrame: number | undefined;
    let thumbnailFrame: number | undefined;
    let focusFrame: number | undefined;
    let focusedThumbnail: HTMLButtonElement | null = null;
    let invoker: HTMLButtonElement | null = null;
    const itemKeys = new WeakMap<HTMLButtonElement, number>();
    let nextItemKey = 0;

    onCleanup(() => {
      if (validationFrame !== undefined) cancelAnimationFrame(validationFrame);
      if (thumbnailFrame !== undefined) cancelAnimationFrame(thumbnailFrame);
      if (focusFrame !== undefined) cancelAnimationFrame(focusFrame);
    });

    const formatPosition = (currentIndex: number, total: number): string =>
      (props['position-label'].value ?? '{current} of {total}')
        .replaceAll('{current}', String(currentIndex + 1))
        .replaceAll('{total}', String(total));
    const position = computed(() => formatPosition(index.value, count.value));
    const thumbnailLimit = computed(() => {
      const value = props['max-thumbnails'].value ?? 5;
      return Number.isSafeInteger(value) && value > 0 ? value : 5;
    });
    const windowStart = computed(() =>
      Math.max(0, Math.min(index.value - Math.floor(thumbnailLimit.value / 2), count.value - thumbnailLimit.value)),
    );
    const visibleThumbnails = computed(() =>
      thumbnailItems.value.slice(windowStart.value, windowStart.value + thumbnailLimit.value),
    );
    watchEffect(() => {
      const value = props['max-thumbnails'].value;
      if (value !== undefined && (!Number.isSafeInteger(value) || value <= 0)) {
        warn('ore-lightbox max-thumbnails must be a positive safe integer; using 5.');
      }
    });
    const status = computed(() =>
      loadState.value === 'loading'
        ? props['loading-label'].value
        : loadState.value === 'error'
          ? `${position.value}. ${props['error-label'].value}`
          : position.value,
    );

    const { isOpen, mount, overlay, requestClose } = useDialogControl({
      defaultOpen: signal(false),
      dialogRef: dialog,
      getPanelEl: () => dialog.value,
      host,
      initialFocus: signal(undefined),
      isPersistent: () => false,
      onCleanup,
      onEvent,
      onNativeClose: (reason) => {
        const active = host.ownerDocument.activeElement;

        if (
          (!invoker?.isConnected || invoker.disabled) &&
          (!active || active === host || active === host.ownerDocument.body)
        ) {
          restoreFocus(items.find((item) => !item.trigger.disabled)?.trigger ?? host);
        }
        invoker = null;
        emit('open-change', { open: false, reason });
      },
      onOpen: (reason) => emit('open-change', { open: true, reason }),
      openProp: signal(undefined),
      returnFocus: signal(true),
    });

    watch(
      () => ({ count: count.value, visible: visibleThumbnails.value }),
      ({ count: total, visible }) => {
        const focused = focusedThumbnail;
        if (!focused) return;
        if (visible.some((item) => item.key === Number(focused.dataset.key)) && total >= 2) return;
        if (focusFrame !== undefined) cancelAnimationFrame(focusFrame);
        focusFrame = requestAnimationFrame(() => {
          focusFrame = undefined;
          if (!isOpen.value) return;
          const active = host.shadowRoot?.activeElement;
          const documentActive = host.ownerDocument.activeElement;
          if (
            (active && active !== focused && active !== dialog.value) ||
            (documentActive !== host && documentActive !== host.ownerDocument.body)
          )
            return;
          const key = current.value?.key;
          const target = host.shadowRoot?.querySelector<HTMLButtonElement>(
            count.value < 2 ? '.close' : `[part="thumbnail"][data-key="${key}"]`,
          );
          target?.focus({ preventScroll: true });
        });
      },
    );

    const show = (nextIndex: number): void => {
      const item = items[nextIndex];

      if (!item) return;
      generation++;
      index.value = nextIndex;
      current.value = item;
      loadState.value = item.src ? 'loading' : 'error';
      if (validationFrame !== undefined) cancelAnimationFrame(validationFrame);
      if (thumbnailFrame !== undefined) cancelAnimationFrame(thumbnailFrame);
      const currentGeneration = generation;

      thumbnailFrame = requestAnimationFrame(() => {
        thumbnailFrame = undefined;
        const track = thumbnails.value;
        const button = track?.querySelector<HTMLButtonElement>(`[data-key="${item.key}"]`);

        if (!track || !button || typeof track.scrollBy !== 'function') return;
        const trackRect = track.getBoundingClientRect();
        const buttonRect = button.getBoundingClientRect();
        const offset =
          buttonRect.left < trackRect.left
            ? buttonRect.left - trackRect.left
            : buttonRect.right > trackRect.right
              ? buttonRect.right - trackRect.right
              : 0;

        if (offset) track.scrollBy({ left: offset });
      });

      if (item.src) {
        validationFrame = requestAnimationFrame(() => {
          validationFrame = undefined;
          if (currentGeneration !== generation) return;
          const image = host.shadowRoot?.querySelector<HTMLImageElement>('img[part="image"]');

          if (!image?.getAttribute('src')) {
            loadState.value = 'error';
          } else if (image.complete) {
            loadState.value = image.naturalWidth > 0 ? 'loaded' : 'error';
          }
        });
      }
      emit('change', { alt: item.alt, count: items.length, index: nextIndex, src: item.src });
    };

    const refresh = (): void => {
      const previous = current.value;
      const previousIndex = index.value;
      items = [...host.querySelectorAll<HTMLButtonElement>(':scope > button')]
        .map((trigger) => {
          const image = trigger.querySelector('img');

          if (!image) return null;
          if (!itemKeys.has(trigger)) itemKeys.set(trigger, nextItemKey++);
          const thumbnailSrc = image.currentSrc || image.src;

          return {
            alt: image.getAttribute('alt') ?? '',
            key: itemKeys.get(trigger)!,
            src: trigger.getAttribute('data-preview-src') ?? thumbnailSrc,
            thumbnailSrc,
            trigger,
          };
        })
        .filter((item): item is ImageItem => item !== null);
      thumbnailItems.value = items;
      count.value = items.length;
      if (!isOpen.value || !previous) return;
      if (!items.length) {
        overlay.close('programmatic');

        return;
      }

      const matchingIndex = items.findIndex((item) => item.trigger === previous.trigger);
      const nextIndex = matchingIndex < 0 ? Math.min(previousIndex, items.length - 1) : matchingIndex;
      const next = items[nextIndex];

      if (next.trigger !== previous.trigger || next.src !== previous.src || next.alt !== previous.alt) {
        show(nextIndex);
      } else {
        index.value = nextIndex;
      }
    };

    const navigate = (direction: number): void => {
      const next = index.value + direction;

      if (next >= 0 && next < items.length) show(next);
    };

    onMounted(() => {
      const element = dialog.value;

      if (!element) return;
      if (!host.hasAttribute('tabindex')) host.setAttribute('tabindex', '-1');
      mount();
      refresh();
      onEvent(element, 'focusin', (event) => {
        const target = event.target;
        if (target === element) return;
        focusedThumbnail = target instanceof HTMLButtonElement && target.matches('[part="thumbnail"]') ? target : null;
      });
      onEvent(host, 'click', (event) => {
        if (!(event.target instanceof Element)) return;
        const trigger = event.target.closest('button');

        if (!trigger || trigger.parentElement !== host || trigger.disabled) return;
        const nextIndex = items.findIndex((item) => item.trigger === trigger);

        if (nextIndex < 0) return;
        invoker = trigger;
        trigger.focus({ preventScroll: true });
        show(nextIndex);
        overlay.open('click');
      });
      const observer = new MutationObserver(refresh);

      observer.observe(host, {
        attributeFilter: ['src', 'srcset', 'alt', 'data-preview-src'],
        attributes: true,
        childList: true,
        subtree: true,
      });
      const keys = createKeymap(
        [
          { handler: () => navigate(-1), id: 'previous', shortcut: 'left' },
          { handler: () => navigate(1), id: 'next', shortcut: 'right' },
        ],
        { when: () => isOpen.value },
      );

      keys.mount(element);

      return () => {
        observer.disconnect();
        keys.dispose();
        overlay.dispose();
      };
    });

    return html`
      <slot></slot>
      <dialog ref="${dialog}" part="dialog" aria-label="${props.label}">
        <div class="toolbar">
          <span class="status" part="status" role="status" aria-atomic="true">${status}</span>
          <button type="button" class="close" part="close" aria-label="${props['close-label']}"
            @click="${() => requestClose('trigger')}">
            <ore-icon name="x" size="20" aria-hidden="true"></ore-icon>
          </button>
        </div>
        <div class="stage">
          <ore-skeleton aria-hidden="true" ?hidden="${() => loadState.value !== 'loading'}"></ore-skeleton>
          ${() => {
            const image = current.value;
            const imageGeneration = generation;

            if (!image?.src) return html``;

            return html`<img part="image" src="${image.src}" alt="${image.alt}"
              ?hidden="${() => loadState.value !== 'loaded'}"
              @load="${() => {
                if (imageGeneration === generation) loadState.value = 'loaded';
              }}"
              @error="${() => {
                if (imageGeneration === generation) loadState.value = 'error';
              }}">`;
          }}
        </div>
        <div class="controls" ?hidden="${() => count.value < 2}">
          <button type="button" part="previous" aria-label="${props['previous-label']}"
            aria-disabled="${() => String(index.value <= 0)}" @click="${() => navigate(-1)}">
            <ore-icon name="chevron-left" size="20" aria-hidden="true"></ore-icon>
          </button>
          <div class="thumbnails" part="thumbnails" ref="${thumbnails}">
            ${each(
              visibleThumbnails,
              (item) => item.key,
              (item, itemIndex) => html`
                <button class="thumbnail" part="thumbnail" type="button"
                  data-key="${() => item.value.key}"
                  aria-label="${() => {
                    const positionLabel = formatPosition(windowStart.value + itemIndex.value, count.value);
                    return item.value.alt ? `${item.value.alt} (${positionLabel})` : positionLabel;
                  }}"
                  aria-current="${() => (windowStart.value + itemIndex.value === index.value ? 'true' : null)}"
                  @click="${() => {
                    const targetIndex = windowStart.value + itemIndex.value;
                    if (targetIndex !== index.value) show(targetIndex);
                  }}">
                  <img src="${() => item.value.thumbnailSrc || item.value.src}" alt="" loading="lazy">
                </button>
              `,
            )}
          </div>
          <button type="button" part="next" aria-label="${props['next-label']}"
            aria-disabled="${() => String(index.value >= count.value - 1)}" @click="${() => navigate(1)}">
            <ore-icon name="chevron-right" size="20" aria-hidden="true"></ore-icon>
          </button>
        </div>
      </dialog>
    `;
  },
  styles: [styles],
});
