import { createDismissal } from '@vielzeug/focus';
import { createId, define, getHost, html, inject, onCleanup, onMounted, prop, useEmit, useSlots } from '@vielzeug/ore';
import { computed, signal, watch } from '@vielzeug/ripple';
import type { OverlayOpenChangeDetail } from '../../core';
import { createDropdownPositioner, lifecycleSignal } from '../../core';
import { elementDirection } from '../../core/direction';
import { NAVBAR_CTX } from '../../layout/navbar/_navbar-context';
import { disablableBundle } from '../../shared';
import { overlayMotionMixin, touchTargetMixin } from '../../styles';
import hostStyles from './navigation-menu.css?inline';
import itemStyles from './navigation-menu-item.css?inline';
import { NAVIGATION_MENU_LINK_TAG } from './navigation-menu-link';
import panelStyles from './navigation-menu-panel.css?inline';

export { ICON_TAG } from '../../content/icon/icon';
export { NAVIGATION_MENU_LINK_TAG } from './navigation-menu-link';

const HOVER_SWITCH_DELAY_MS = 150;
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'summary',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',');

export type OreNavigationMenuEvents = {
  'open-change': OverlayOpenChangeDetail & { value: string | null };
  select: NavigationMenuSelectDetail;
};

export type NavigationMenuSelectDetail = {
  href: string;
  value: string;
};

export type OreNavigationMenuItemProps = {
  active?: boolean;
  disabled?: boolean;
  value: string;
};

export type OreNavigationMenuProps = {
  /** Close after activating a panel link. */
  'close-on-select'?: boolean;
  columns?: number;
  'default-open'?: string;
  disabled?: boolean;
  /** Render the panel inline instead of in the popover layer. */
  inline?: boolean;
  open?: string;
  placement?: 'bottom-end' | 'bottom-start';
};

const parseOptionalString = (value: string | null): string | undefined => value ?? undefined;

const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
  const elements: HTMLElement[] = [];

  const visit = (root: ParentNode, hiddenAncestor = false): void => {
    for (const element of Array.from(root.children)) {
      if (!(element instanceof HTMLElement)) continue;

      const hidden = hiddenAncestor || Boolean(element.closest('[hidden], [inert], [aria-hidden="true"]'));

      if (!hidden && element.matches(FOCUSABLE_SELECTOR) && element.tabIndex >= 0) elements.push(element);

      visit(element.shadowRoot ?? element, hidden);
    }
  };

  visit(container);

  return elements;
};

/**
 * A trigger for an associated navigation panel.
 *
 * @element ore-navigation-menu-item
 *
 * @attr {boolean} active - Marks the trigger as the current navigation section
 * @attr {boolean} disabled - Disables panel activation
 * @attr {string} value - Unique value matched by a panel's `for` attribute
 *
 * @slot - Trigger label and optional icon
 */
export const NAVIGATION_MENU_ITEM_TAG = 'ore-navigation-menu-item' as const;
define<OreNavigationMenuItemProps>(NAVIGATION_MENU_ITEM_TAG, {
  props: { active: prop.bool(false), disabled: prop.bool(false), value: prop.string('') },
  setup(props) {
    return html`
      <button class="trigger" type="button" ?disabled=${props.disabled}>
        <slot></slot>
        <ore-icon aria-hidden="true" class="chevron" name="chevron-down" size="14" stroke-width="2"></ore-icon>
      </button>
    `;
  },
  styles: [touchTargetMixin, itemStyles],
});

/**
 * An anchored navigation panel associated with an item.
 *
 * @element ore-navigation-menu-panel
 *
 * @attr {string} for - Value of the associated navigation menu item
 *
 * @slot - Panel content
 * @slot footer - Optional panel footer
 *
 * @part content - Grid container for panel content
 * @part footer - Container for optional footer content
 */
export const NAVIGATION_MENU_PANEL_TAG = 'ore-navigation-menu-panel' as const;
define<{ for?: string }>(NAVIGATION_MENU_PANEL_TAG, {
  props: { for: prop.string() },
  setup() {
    const slots = useSlots();

    return html`
      <span class="column-measure" aria-hidden="true"></span>
      <div class="content" part="content"><slot></slot></div>
      <div class="footer" part="footer" ?hidden=${() => !slots.has('footer').value}><slot name="footer"></slot></div>
    `;
  },
  styles: [overlayMotionMixin('panel'), panelStyles],
});

/**
 * A set of disclosure triggers with anchored, non-modal navigation panels.
 *
 * @element ore-navigation-menu
 *
 * @attr {string} open - Controlled active trigger value
 * @attr {string} default-open - Initial active trigger value
 * @attr {boolean} close-on-select - Closes after activating a panel link
 * @attr {boolean} inline - Renders the active panel in document flow
 * @attr {number} columns - Maximum number of panel content columns
 * @attr {boolean} disabled - Disables all triggers
 * @attr {'bottom-start'|'bottom-end'} placement - Panel placement relative to its trigger
 *
 * @slot - Navigation menu items and panels
 *
 * @event open-change - Requested active panel change
 * @event select - A panel link was activated
 *
 * @slot panel - Optional panels placed outside the default slot
 * @slot footer - Optional content following the menu items and panels
 *
 * @cssprop --navigation-menu-panel-width - Maximum panel width
 * @cssprop --navigation-menu-panel-max-height - Maximum panel height
 * @cssprop --navigation-menu-panel-columns - Maximum content column count when `columns` is unset
 * @cssprop --navigation-menu-column-min - Minimum panel column width
 * @cssprop --navigation-menu-trigger-gap - Gap between panel triggers
 * @cssprop --navigation-menu-bg - Panel background
 * @cssprop --navigation-menu-border-color - Panel border color
 * @cssprop --navigation-menu-radius - Panel corner radius
 * @cssprop --navigation-menu-shadow - Panel shadow
 * @cssprop --navigation-menu-backdrop-blur - Frosted panel backdrop blur
 */
export const NAVIGATION_MENU_TAG = 'ore-navigation-menu' as const;
define<OreNavigationMenuProps>(NAVIGATION_MENU_TAG, {
  props: {
    ...disablableBundle,
    'close-on-select': prop.bool(true),
    columns: prop.number(),
    'default-open': prop.string(),
    disabled: prop.bool(false),
    inline: prop.bool(false),
    open: { default: undefined as string | undefined, parse: parseOptionalString },
    placement: prop.oneOf(['bottom-end', 'bottom-start'] as const, 'bottom-start'),
  },
  setup(props) {
    const host = getHost();
    const emit = useEmit<OreNavigationMenuEvents>();
    const abortSignal = lifecycleSignal(onCleanup);
    const navbarContext = inject(NAVBAR_CTX);
    const isInline = computed(() => props.inline.value || Boolean(navbarContext?.isMobile.value));
    const isDisabled = computed(() => props.disabled.value);
    const activeValue = signal<string | null>(null);
    let activeTrigger: HTMLElement | null = null;
    let activePanel: HTMLElement | null = null;
    let pointerDownWithinPanel = false;
    let stopPositioning: (() => void) | null = null;
    let hoverSwitchTimer: number | undefined;
    const inlineOrder = new Map<HTMLElement, string>();
    const originalPanelColumns = new Map<HTMLElement, string>();

    const allItems = () => Array.from(host.querySelectorAll<HTMLElement>(NAVIGATION_MENU_ITEM_TAG));
    const items = () => allItems().filter((item) => !item.hasAttribute('disabled'));
    const valueOf = (item: HTMLElement) => item.getAttribute('value') ?? '';
    const panels = () => Array.from(host.querySelectorAll<HTMLElement>(NAVIGATION_MENU_PANEL_TAG));
    const panelFor = (value: string) => panels().find((panel) => panel.getAttribute('for') === value) ?? null;
    const isControlled = () => props.open.value !== undefined;
    const triggerButtonFor = (item: HTMLElement | null) =>
      item?.shadowRoot?.querySelector<HTMLButtonElement>('.trigger') ?? null;

    const positioner = createDropdownPositioner({
      getFloating: () => activePanel,
      getOffsetPx: () => 8,
      getPlacement: () => props.placement.value ?? 'bottom-start',
      getReference: () => triggerButtonFor(activeTrigger) ?? activeTrigger,
      matchWidth: false,
      useClippingAncestor: false,
    });

    const panelColumns = (panel?: HTMLElement): number => {
      const inheritedColumns =
        props.columns.value ??
        (panel
          ? Number.parseFloat(
              panel.ownerDocument.defaultView
                ?.getComputedStyle(panel)
                .getPropertyValue('--navigation-menu-panel-columns') ?? '',
            )
          : undefined);
      const columns = inheritedColumns ?? 2;

      return Number.isFinite(columns) ? Math.max(1, Math.trunc(columns)) : 2;
    };

    const updatePanelColumns = (panel: HTMLElement): void => {
      if (!originalPanelColumns.has(panel)) {
        originalPanelColumns.set(panel, panel.style.getPropertyValue('--navigation-menu-panel-columns'));
      }

      if (props.columns.value === undefined) {
        const original = originalPanelColumns.get(panel) ?? '';

        if (original) panel.style.setProperty('--navigation-menu-panel-columns', original);
        else panel.style.removeProperty('--navigation-menu-panel-columns');

        return;
      }

      panel.style.setProperty('--navigation-menu-panel-columns', String(panelColumns(panel)));
    };

    const updatePanelWidth = (panel: HTMLElement): void => {
      updatePanelColumns(panel);

      if (isInline.value) {
        panel.style.removeProperty('--_navigation-menu-auto-width');
        return;
      }

      const view = panel.ownerDocument.defaultView;
      const measure = panel.shadowRoot?.querySelector<HTMLElement>('.column-measure');
      const content = panel.shadowRoot?.querySelector<HTMLElement>('.content');

      if (!view || !measure || !content) return;

      const columnWidth = measure.getBoundingClientRect().width;

      if (columnWidth <= 0) return;

      const contentStyle = view.getComputedStyle(content);
      const panelStyle = view.getComputedStyle(panel);
      const pixelValue = (value: string): number => Number.parseFloat(value) || 0;
      const gap = pixelValue(contentStyle.columnGap);
      const horizontalPadding = pixelValue(contentStyle.paddingInlineStart) + pixelValue(contentStyle.paddingInlineEnd);
      const horizontalBorder =
        pixelValue(panelStyle.borderInlineStartWidth) + pixelValue(panelStyle.borderInlineEndWidth);
      const width =
        columnWidth * panelColumns(panel) + gap * (panelColumns(panel) - 1) + horizontalPadding + horizontalBorder;

      panel.style.setProperty('--_navigation-menu-auto-width', `${width}px`);
    };

    const showPanel = (panel: HTMLElement): void => {
      panel.hidden = false;
      panel.dataset.open = '';
      panel.toggleAttribute('data-inline', isInline.value);

      if (isInline.value) {
        if ('hidePopover' in panel) {
          try {
            if (panel.matches(':popover-open')) panel.hidePopover();
          } catch {
            // The inline data state remains authoritative if a sandbox rejects the Popover API.
          }
        }

        return;
      }

      if ('showPopover' in panel) {
        try {
          if (!panel.matches(':popover-open')) panel.showPopover();
        } catch {
          // Sandboxed documents can reject the Popover API; data-open remains the fixed-position fallback.
        }
      }
    };

    const hidePanel = (panel: HTMLElement): void => {
      delete panel.dataset.open;

      if ('hidePopover' in panel) {
        try {
          if (panel.matches(':popover-open')) panel.hidePopover();
        } catch {
          // The fallback visibility state is still cleared below.
        }
      }

      panel.hidden = true;
    };

    const focusPanelFirst = (): void => {
      if (!activePanel || activePanel.hidden) return;

      getFocusableElements(activePanel)[0]?.focus();
    };

    const requestActive = (value: string | null, reason: OverlayOpenChangeDetail['reason']): void => {
      if (isDisabled.value || activeValue.value === value) return;

      if (value !== null && (!panelFor(value) || !items().some((item) => valueOf(item) === value))) return;

      if (!isControlled()) applyActive(value);

      emit('open-change', { open: value !== null, reason, value });
    };

    const applyActive = (value: string | null): void => {
      const nextPanel = value === null ? null : panelFor(value);
      const nextTrigger = value === null ? null : (items().find((item) => valueOf(item) === value) ?? null);

      if (value !== null && (!nextPanel || !nextTrigger)) return;

      clearHoverSwitch();
      stopPositioning?.();
      stopPositioning = null;
      activeValue.value = value;
      activeTrigger = nextTrigger;
      activePanel = nextPanel;

      for (const item of allItems()) {
        item.toggleAttribute('data-open', value !== null && valueOf(item) === value);
        triggerButtonFor(item)?.setAttribute('aria-expanded', String(value !== null && valueOf(item) === value));
      }

      for (const panel of panels()) {
        panel.toggleAttribute('data-inline', isInline.value);
        if (panel !== nextPanel) hidePanel(panel);
      }

      if (nextPanel) {
        nextPanel.setAttribute('aria-labelledby', activeTrigger?.id ?? '');
        showPanel(nextPanel);

        if (!isInline.value) {
          updatePanelWidth(nextPanel);
          positioner.update();
          stopPositioning = positioner.startAutoUpdate?.() ?? null;

          nextPanel.ownerDocument.defaultView?.requestAnimationFrame(() => {
            if (abortSignal.aborted || activePanel !== nextPanel || isInline.value) return;

            updatePanelWidth(nextPanel);
            positioner.update();
          });
        }
      }
    };

    const setInlineOrder = (element: HTMLElement, order: number): void => {
      if (!inlineOrder.has(element)) inlineOrder.set(element, element.style.order);
      element.style.order = String(order);
    };

    const restoreInlineOrder = (): void => {
      for (const [element, order] of inlineOrder) {
        if (order) element.style.order = order;
        else element.style.removeProperty('order');
      }

      inlineOrder.clear();
    };

    const updateInlineMode = (): void => {
      const inline = isInline.value;
      host.toggleAttribute('data-inline', inline);

      let order = 0;

      for (const item of allItems()) {
        item.toggleAttribute('data-inline', inline);

        if (inline) setInlineOrder(item, order++);

        const panel = panelFor(valueOf(item));

        if (panel && inline) setInlineOrder(panel, order++);
      }

      for (const panel of panels()) panel.toggleAttribute('data-inline', inline);

      if (!inline) restoreInlineOrder();
      if (activeValue.value !== null) applyActive(activeValue.value);
    };

    const clearHoverSwitch = (): void => {
      if (hoverSwitchTimer === undefined) return;

      host.ownerDocument.defaultView?.clearTimeout(hoverSwitchTimer);
      hoverSwitchTimer = undefined;
    };

    onCleanup(() => {
      clearHoverSwitch();
      restoreInlineOrder();
      stopPositioning?.();

      for (const panel of panels()) hidePanel(panel);
      host.removeAttribute('data-inline');

      for (const item of allItems()) item.removeAttribute('data-inline');
      for (const panel of panels()) panel.removeAttribute('data-inline');

      for (const [panel, columns] of originalPanelColumns) {
        if (columns) panel.style.setProperty('--navigation-menu-panel-columns', columns);
        else panel.style.removeProperty('--navigation-menu-panel-columns');
      }

      originalPanelColumns.clear();
    });

    createDismissal({
      getTargets: () => [host, activePanel],
      isActive: () => activeValue.value !== null,
      onDismiss: () => requestActive(null, 'outsideClick'),
      ownerDocument: host.ownerDocument,
      signal: abortSignal,
    });

    watch(isInline, updateInlineMode, { immediate: true });

    watch(props.columns, () => {
      if (!activePanel || isInline.value) return;

      updatePanelWidth(activePanel);
      positioner.update();
    });

    onMounted(() => {
      const view = host.ownerDocument.defaultView;
      const values = new Set<string>();

      updateInlineMode();

      view?.addEventListener(
        'resize',
        () => {
          if (!activePanel || isInline.value) return;

          updatePanelWidth(activePanel);
          positioner.update();
        },
        { signal: abortSignal },
      );
      host.ownerDocument.addEventListener('pointerup', () => (pointerDownWithinPanel = false), {
        signal: abortSignal,
      });
      host.ownerDocument.addEventListener('pointercancel', () => (pointerDownWithinPanel = false), {
        signal: abortSignal,
      });

      for (const panel of panels()) {
        panel.setAttribute('popover', 'manual');
        panel.setAttribute('role', 'region');
        hidePanel(panel);

        panel.addEventListener(
          'pointerdown',
          () => {
            pointerDownWithinPanel = panel === activePanel;
          },
          { signal: abortSignal },
        );

        panel.addEventListener(
          'click',
          (event) => {
            const path = event.composedPath();
            const navigationLink = path.find(
              (node): node is HTMLElement => node instanceof HTMLElement && node.localName === NAVIGATION_MENU_LINK_TAG,
            );
            const anchor = path.find(
              (node): node is HTMLAnchorElement => node instanceof HTMLAnchorElement && node.hasAttribute('href'),
            );
            const link = navigationLink ?? anchor;

            if (!link || !panel.contains(link)) return;

            const href =
              anchor?.href ?? navigationLink?.shadowRoot?.querySelector<HTMLAnchorElement>('a[href]')?.href ?? '';

            if (!href) return;

            const value = activeValue.value;

            if (!value) return;

            emit('select', { href, value });

            if (props['close-on-select'].value && !link.closest('[data-navigation-menu-keep-open]')) {
              requestActive(null, 'select');
            }
          },
          { signal: abortSignal },
        );

        panel.addEventListener(
          'keydown',
          (event) => {
            if (event.key === 'Escape' && activeValue.value !== null) {
              const trigger = triggerButtonFor(activeTrigger);
              event.preventDefault();
              requestActive(null, 'escape');
              trigger?.focus();
              return;
            }

            if (event.key !== 'Tab') return;

            const focusable = getFocusableElements(panel);
            const target = event
              .composedPath()
              .find((node): node is HTMLElement => node instanceof HTMLElement && focusable.includes(node));
            const index = target ? focusable.indexOf(target) : -1;

            if (event.shiftKey && index === 0) {
              event.preventDefault();
              triggerButtonFor(activeTrigger)?.focus();
              return;
            }

            if (!event.shiftKey && index === focusable.length - 1 && focusable.length > 0) {
              const activeIndex = allItems().indexOf(activeTrigger!);
              const nextTrigger = items().find((item) => allItems().indexOf(item) > activeIndex);

              if (!nextTrigger) return;

              event.preventDefault();
              triggerButtonFor(nextTrigger)?.focus();
            }
          },
          { signal: abortSignal },
        );
      }

      host.addEventListener(
        'focusout',
        () => {
          queueMicrotask(() => {
            if (
              abortSignal.aborted ||
              !activeTrigger ||
              !activePanel ||
              pointerDownWithinPanel ||
              activeTrigger.matches(':focus-within') ||
              activePanel.matches(':focus-within')
            ) {
              return;
            }

            requestActive(null, 'focusout');
          });
        },
        { signal: abortSignal },
      );

      for (const item of allItems()) {
        const value = valueOf(item);
        const panel = panelFor(value);

        if (item.hasAttribute('disabled') || !value || values.has(value) || !panel) continue;

        values.add(value);
        item.id ||= createId('navigation-menu-trigger');
        panel.setAttribute('aria-labelledby', item.id);

        const trigger = triggerButtonFor(item);

        if (!trigger) continue;

        trigger.setAttribute('aria-expanded', 'false');
        trigger.addEventListener('click', () => requestActive(activeValue.value === value ? null : value, 'click'), {
          signal: abortSignal,
        });
        trigger.addEventListener(
          'keydown',
          (event) => {
            if (event.key === 'Escape' && activeValue.value === value) {
              event.preventDefault();
              requestActive(null, 'escape');
              trigger.focus();
              return;
            }

            const all = items();
            const index = all.indexOf(item);
            const rtl = elementDirection(host) === 'rtl';

            if (
              event.key === 'ArrowLeft' ||
              event.key === 'ArrowRight' ||
              event.key === 'Home' ||
              event.key === 'End'
            ) {
              event.preventDefault();

              const next =
                event.key === 'Home'
                  ? all[0]
                  : event.key === 'End'
                    ? all.at(-1)
                    : all[
                        (index + (event.key === (rtl ? 'ArrowLeft' : 'ArrowRight') ? 1 : all.length - 1)) % all.length
                      ];

              triggerButtonFor(next ?? null)?.focus();
            } else if (event.key === 'Tab' && !event.shiftKey && activeValue.value === value) {
              const first = activePanel ? getFocusableElements(activePanel)[0] : undefined;

              if (first) {
                event.preventDefault();
                first.focus();
              }
            } else if (event.key === 'ArrowDown') {
              event.preventDefault();
              requestActive(value, 'keyboard');
              requestAnimationFrame(() => {
                if (!abortSignal.aborted && activeValue.value === value) focusPanelFirst();
              });
            }
          },
          { signal: abortSignal },
        );

        item.addEventListener(
          'pointerenter',
          (event: PointerEvent) => {
            const hasFineHover = view?.matchMedia?.('(hover: hover) and (pointer: fine)').matches ?? false;

            if (
              activeValue.value === null ||
              activeValue.value === value ||
              event.pointerType === 'touch' ||
              !view ||
              !hasFineHover
            ) {
              return;
            }

            clearHoverSwitch();
            hoverSwitchTimer = view.setTimeout(() => {
              hoverSwitchTimer = undefined;
              requestActive(value, 'hover');
            }, HOVER_SWITCH_DELAY_MS);
          },
          { signal: abortSignal },
        );
        item.addEventListener('pointerleave', clearHoverSwitch, { signal: abortSignal });
      }

      if (props.open.value !== undefined) applyActive(props.open.value);
      else if (props['default-open'].value) applyActive(props['default-open'].value);
    });

    watch(props.open, (value) => {
      if (value !== undefined) applyActive(value);
    });

    watch(props.disabled, (disabled) => {
      if (disabled) applyActive(null);
    });

    return html`
      <div class="triggers">
        <slot></slot>
        <slot name="panel"></slot>
        <slot name="footer"></slot>
      </div>
    `;
  },
  styles: [hostStyles],
});
