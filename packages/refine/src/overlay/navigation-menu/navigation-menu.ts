import { createStableId, define, getHost, html, onCleanup, onMounted, prop, useEmit, useSlots } from '@vielzeug/ore';
import { computed, signal, watch } from '@vielzeug/ripple';

import type { OverlayOpenChangeDetail } from '../../core';

import { createDropdownPositioner, createOutsidePointerDismissal, lifecycleSignal } from '../../core';
import { disablableBundle } from '../../shared';
import { reducedMotionMixin } from '../../styles';
import hostStyles from './navigation-menu.css?inline';
import itemStyles from './navigation-menu-item.css?inline';
import panelStyles from './navigation-menu-panel.css?inline';

export type OreNavigationMenuEvents = {
  'open-change': OverlayOpenChangeDetail & { value: string | null };
  select: NavigationMenuSelectDetail;
};

export type NavigationMenuSelectDetail = {
  href: string;
  value: string;
};

export type OreNavigationMenuItemProps = {
  disabled?: boolean;
  value: string;
};

export type OreNavigationMenuProps = {
  /** Close after activating a panel link. */
  'close-on-select'?: boolean;
  columns?: number;
  'default-open'?: string;
  disabled?: boolean;
  /** Accessible label for the trigger region. */
  label?: string;
  open?: string;
  placement?: 'bottom-end' | 'bottom-start';
};

const parseOptionalString = (value: string | null): string | undefined => value ?? undefined;

/**
 * A trigger for an associated navigation menu panel.
 *
 * @element ore-navigation-menu-item
 *
 * @attr {boolean} disabled - Disables panel activation
 * @attr {string} value - Unique value matched by a panel's `for` attribute
 *
 * @slot - Trigger label and optional icon
 */
export const NAVIGATION_MENU_ITEM_TAG = 'ore-navigation-menu-item' as const;
define<OreNavigationMenuItemProps>(NAVIGATION_MENU_ITEM_TAG, {
  props: { disabled: prop.bool(false), value: prop.string('') },
  setup(props) {
    return html`
      <button class="trigger" type="button" ?disabled=${props.disabled}><slot></slot></button>
    `;
  },
  styles: [itemStyles],
});

/**
 * An anchored navigation menu panel associated with an item.
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
      <div class="content" part="content"><slot></slot></div>
      <div class="footer" part="footer" ?hidden=${() => !slots.has('footer').value}><slot name="footer"></slot></div>
    `;
  },
  styles: [panelStyles],
});

/**
 * A horizontal set of triggers with anchored, non-modal navigation panels.
 *
 * @element ore-navigation-menu
 *
 * @attr {string} open - Controlled active trigger value
 * @attr {string} default-open - Initial uncontrolled active trigger value
 * @attr {boolean} close-on-select - Closes after activating a panel link
 * @attr {number} columns - Number of panel content columns
 * @attr {boolean} disabled - Disables all triggers
 * @attr {string} label - Accessible navigation region label
 * @attr {'bottom-start'|'bottom-end'} placement - Panel placement relative to its trigger
 *
 * @slot - Navigation menu items and panels
 *
 * @event open-change - Requested active panel change
 * @event select - A panel link was activated
 *
 * @cssprop --navigation-menu-panel-width - Maximum panel width
 * @cssprop --navigation-menu-panel-columns - Fallback number of panel content columns
 * @cssprop --navigation-menu-backdrop-blur - Frosted panel backdrop blur
 */
export const NAVIGATION_MENU_TAG = 'ore-navigation-menu' as const;
define<OreNavigationMenuProps>(NAVIGATION_MENU_TAG, {
  props: {
    ...disablableBundle,
    'close-on-select': prop.bool(true),
    columns: prop.number(),
    'default-open': prop.string(),
    label: prop.string('Navigation menu'),
    open: { default: undefined as string | undefined, parse: parseOptionalString },
    placement: prop.oneOf(['bottom-end', 'bottom-start'] as const, 'bottom-start'),
  },
  setup(props) {
    const host = getHost();
    const emit = useEmit<OreNavigationMenuEvents>();
    const abortSignal = lifecycleSignal(onCleanup);
    const panelId = createStableId('navigation-menu');
    const isDisabled = computed(() => props.disabled.value);
    const activeValue = signal<string | null>(null);
    let activeTrigger: HTMLElement | null = null;
    let activePanel: HTMLElement | null = null;
    let stopPositioning: (() => void) | null = null;

    const items = () => Array.from(host.querySelectorAll<HTMLElement>(`${NAVIGATION_MENU_ITEM_TAG}:not([disabled])`));
    const valueOf = (item: HTMLElement) => item.getAttribute('value') ?? '';
    const panels = () => Array.from(host.querySelectorAll<HTMLElement>(NAVIGATION_MENU_PANEL_TAG));
    const panelFor = (value: string) => panels().find((panel) => panel.getAttribute('for') === value) ?? null;
    const isControlled = () => props.open.value !== undefined;
    const panelIdFor = (panel: HTMLElement) => (panel.id ||= createStableId('navigation-menu-panel'));

    const positioner = createDropdownPositioner({
      getFloating: () => activePanel,
      getPlacement: () => props.placement.value ?? 'bottom-start',
      getReference: () => activeTrigger?.shadowRoot?.querySelector<HTMLElement>('.trigger') ?? activeTrigger,
      matchWidth: false,
      offsetPx: 8,
      useClippingAncestor: false,
    });

    const panelColumns = (): number | undefined => {
      const columns = props.columns.value;

      return columns === undefined ? undefined : Math.max(1, Math.trunc(columns));
    };

    const showPanel = (panel: HTMLElement): void => {
      panel.hidden = false;
      panel.dataset.open = '';

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

    const applyActive = (value: string | null): void => {
      const nextPanel = value === null ? null : panelFor(value);

      stopPositioning?.();
      stopPositioning = null;
      activeValue.value = value;
      activeTrigger = value ? (items().find((item) => valueOf(item) === value) ?? null) : null;
      activePanel = nextPanel;

      for (const item of items()) {
        const expanded = valueOf(item) === value;
        const trigger = item.shadowRoot?.querySelector<HTMLElement>('.trigger');

        item.setAttribute('aria-expanded', String(expanded));
        trigger?.setAttribute('aria-expanded', String(expanded));
      }
      for (const panel of panels()) {
        if (panel !== nextPanel) hidePanel(panel);
      }

      if (nextPanel) {
        const columns = panelColumns();

        if (columns !== undefined) nextPanel.style.setProperty('--navigation-menu-panel-columns', String(columns));

        nextPanel.setAttribute('aria-labelledby', activeTrigger?.id ?? '');
        showPanel(nextPanel);
        positioner.update();
        stopPositioning = positioner.startAutoUpdate?.() ?? null;
      }
    };

    const requestActive = (value: string | null, reason: OverlayOpenChangeDetail['reason']): void => {
      if (isDisabled.value || activeValue.value === value) return;

      if (value !== null && !panelFor(value)) return;

      if (!isControlled()) applyActive(value);

      emit('open-change', { open: value !== null, reason, value });
    };

    onCleanup(() => {
      stopPositioning?.();

      for (const panel of panels()) hidePanel(panel);
    });

    createOutsidePointerDismissal({
      getTargets: () => [host, activePanel],
      isActive: () => activeValue.value !== null,
      onDismiss: () => requestActive(null, 'outsideClick'),
      signal: abortSignal,
    });

    onMounted(() => {
      const values = new Set<string>();

      for (const panel of panels()) {
        panel.setAttribute('popover', 'manual');
        panel.setAttribute('role', 'region');
        panelIdFor(panel);
        hidePanel(panel);

        panel.addEventListener(
          'click',
          (event) => {
            const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;

            if (!link || !panel.contains(link)) return;

            const value = activeValue.value;

            if (!value) return;

            emit('select', { href: link.href, value });

            if (props['close-on-select'].value && !link.closest('[data-navigation-menu-keep-open]')) {
              requestActive(null, 'select');
            }
          },
          { signal: abortSignal },
        );
      }

      document.addEventListener(
        'keydown',
        (event) => {
          if (event.key !== 'Escape' || activeValue.value === null) return;

          event.preventDefault();
          requestActive(null, 'escape');
          activeTrigger?.shadowRoot?.querySelector<HTMLElement>('.trigger')?.focus();
        },
        { signal: abortSignal },
      );

      for (const item of items()) {
        const value = valueOf(item);
        const panel = panelFor(value);

        if (!value || values.has(value) || !panel) continue;

        values.add(value);
        item.id ||= createStableId('navigation-menu-trigger');

        const trigger = item.shadowRoot?.querySelector<HTMLButtonElement>('.trigger');

        if (!trigger) continue;

        trigger.setAttribute('aria-controls', panelIdFor(panel));
        trigger.setAttribute('aria-haspopup', 'true');
        trigger.setAttribute('aria-expanded', 'false');
        item.setAttribute('aria-expanded', 'false');
        trigger.addEventListener('click', () => requestActive(activeValue.value === value ? null : value, 'click'), {
          signal: abortSignal,
        });
        trigger.addEventListener(
          'keydown',
          (event) => {
            const all = items();
            const index = all.indexOf(item);

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
                    : all[(index + (event.key === 'ArrowRight' ? 1 : all.length - 1)) % all.length];

              next?.shadowRoot?.querySelector<HTMLElement>('.trigger')?.focus();
            } else if (event.key === 'ArrowDown') {
              event.preventDefault();
              requestActive(value, 'keyboard');
              requestAnimationFrame(() =>
                activePanel?.querySelector<HTMLElement>('a, button, input, [tabindex]:not([tabindex="-1"])')?.focus(),
              );
            }
          },
          { signal: abortSignal },
        );
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
      <nav class="triggers" aria-label="${props.label}" id="${panelId}"><slot></slot></nav>
      <slot name="panel"></slot>
      <slot name="footer"></slot>
    `;
  },
  styles: [reducedMotionMixin, hostStyles],
});
