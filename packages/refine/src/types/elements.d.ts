/**
 * Global HTMLElementTagNameMap augmentations for all block custom elements.
 * This file is the single source of truth for element type registrations.
 *
 * Every type referenced below is imported explicitly. The root tsconfig sets
 * `skipLibCheck: true`, which exempts `.d.ts` files from having their contents verified — an
 * unresolvable bare type name here doesn't raise `TS2304: Cannot find name`, it silently
 * resolves to `any`, which then collapses the entire intersection it's part of to `any` too.
 * That turns every property/method access on the affected tag into a silent no-op for
 * consumers — no autocomplete, no error, nothing — which is a much worse failure mode than a
 * build error. Importing the real types is what keeps this file honest under `skipLibCheck`;
 * see `src/types/elements.test.ts` for the regression test that would have caught this.
 */

import type { OreAvatarGroupProps, OreAvatarProps } from '../content/avatar/avatar';
import type { OreBreadcrumbItemProps, OreBreadcrumbProps } from '../content/breadcrumb/breadcrumb';
import type { OreCardEvents, OreCardProps } from '../content/card/card';
import type { OreCarouselEvents, OreCarouselProps } from '../content/carousel/carousel';
import type { OreCodeWindowProps } from '../content/code-window/code-window';
import type { OreCopyCommandEvents, OreCopyCommandProps } from '../content/copy-command/copy-command';
import type { OreIconProps } from '../content/icon/icon';
import type { OrePaginationEvents, OrePaginationProps } from '../content/pagination/pagination';
import type { OreSeparatorProps } from '../content/separator/separator';
import type { OreTableProps } from '../content/table/table';
import type { OreTextProps } from '../content/text/text';
import type { OreAccordionItemEvents, OreAccordionItemProps } from '../disclosure/accordion-item/accordion-item';
import type { OreAccordionEvents, OreAccordionProps } from '../disclosure/accordion/accordion';
import type { OreTabItemProps } from '../disclosure/tab-item/tab-item';
import type { OreTabPanelProps } from '../disclosure/tab-panel/tab-panel';
import type { OreTabsEvents, OreTabsProps } from '../disclosure/tabs/tabs';
import type { OreAlertEvents, OreAlertProps } from '../feedback/alert/alert';
import type { OreAsyncEvents, OreAsyncProps } from '../feedback/async/async';
import type { OreBadgeProps } from '../feedback/badge/badge';
import type { OreChipEvents, OreChipProps } from '../feedback/chip/chip';
import type { OrePasswordStrengthProps } from '../feedback/password-strength/password-strength';
import type { OreProgressProps } from '../feedback/progress/progress';
import type { OreSkeletonProps } from '../feedback/skeleton/skeleton';
import type { ToastElement } from '../feedback/toast/toast';
import type { OreButtonGroupProps } from '../inputs/button-group/button-group';
import type { OreButtonProps } from '../inputs/button/button';
import type { OreCalendarEvents, OreCalendarProps } from '../inputs/calendar/calendar';
import type { OreCheckboxGroupEvents, OreCheckboxGroupProps } from '../inputs/checkbox-group/checkbox-group';
import type { OreCheckboxEvents, OreCheckboxProps } from '../inputs/checkbox/checkbox';
import type { OreComboboxEvents, OreComboboxOptionProps, OreComboboxProps } from '../inputs/combobox/combobox.types';
import type { OreDataGridEvents, OreDataGridProps } from '../inputs/datagrid/datagrid';
import type { OreDatePickerEvents, OreDatePickerProps } from '../inputs/date-picker/date-picker';
import type { OreFileInputEvents, OreFileInputProps } from '../inputs/file-input/file-input';
import type { OreFormEvents, OreFormProps } from '../inputs/form/form';
import type { OreInputEvents, OreInputProps } from '../inputs/input/input';
import type { OreMessageComposerEvents, OreMessageComposerProps } from '../inputs/message-composer/message-composer';
import type { OreNumberInputEvents, OreNumberInputProps } from '../inputs/number-input/number-input';
import type { OreOtpInputEvents, OreOtpInputProps } from '../inputs/otp-input/otp-input';
import type { OreRadioGroupEvents, OreRadioGroupProps } from '../inputs/radio-group/radio-group';
import type { OreRadioEvents, OreRadioProps } from '../inputs/radio/radio';
import type { OreRatingEvents, OreRatingProps } from '../inputs/rating/rating';
import type { OreSelectEvents, OreSelectProps } from '../inputs/select/select';
import type { OreSliderEvents, OreSliderProps } from '../inputs/slider/slider';
import type { OreSwitchEvents, OreSwitchProps } from '../inputs/switch/switch';
import type { OreTextareaEvents, OreTextareaProps } from '../inputs/textarea/textarea';
import type { OreTimePickerEvents, OreTimePickerProps } from '../inputs/time-picker/time-picker';
import type { OreBoxProps } from '../layout/box/box';
import type { OreGridItemProps } from '../layout/grid-item/grid-item';
import type { OreGridProps } from '../layout/grid/grid';
import type { NavbarElement, OreNavbarEvents, OreNavbarItemProps } from '../layout/navbar/navbar';
import type {
  OreSidebarEvents,
  OreSidebarGroupEvents,
  OreSidebarGroupProps,
  OreSidebarItemProps,
  SidebarElement,
} from '../layout/sidebar/sidebar';
import type { OreDialogEvents, OreDialogProps } from '../overlay/dialog/dialog';
import type { DrawerElement, OreDrawerEvents } from '../overlay/drawer/drawer';
import type { OreMenuEvents, OreMenuItemProps, OreMenuProps } from '../overlay/menu/menu';
import type { OrePopoverEvents, OrePopoverProps } from '../overlay/popover/popover';
import type { OreTooltipProps } from '../overlay/tooltip/tooltip';
import type { AddEventListeners, FormValidityMethods } from '../shared';

export {};

declare global {
  interface HTMLElementTagNameMap {
    // content
    'ore-avatar': HTMLElement & OreAvatarProps;
    'ore-avatar-group': HTMLElement & OreAvatarGroupProps;
    'ore-breadcrumb': HTMLElement & OreBreadcrumbProps;
    'ore-breadcrumb-item': HTMLElement & OreBreadcrumbItemProps;
    'ore-card': HTMLElement & OreCardProps & AddEventListeners<OreCardEvents>;
    'ore-carousel': HTMLElement & OreCarouselProps & AddEventListeners<OreCarouselEvents>;
    'ore-carousel-slide': HTMLElement;
    'ore-code-window': HTMLElement & OreCodeWindowProps;
    'ore-copy-command': HTMLElement & OreCopyCommandProps & AddEventListeners<OreCopyCommandEvents>;
    'ore-icon': HTMLElement & OreIconProps;
    'ore-pagination': HTMLElement & OrePaginationProps & AddEventListeners<OrePaginationEvents>;
    'ore-separator': HTMLElement & OreSeparatorProps;
    'ore-table': HTMLElement & OreTableProps;
    'ore-text': HTMLElement & OreTextProps;
    // table markers (light-DOM authoring API used by ore-table)
    'ore-tr': HTMLElement & { foot?: boolean; head?: boolean };
    'ore-th': HTMLElement & {
      abbr?: string;
      axis?: string;
      colspan?: number | string;
      headers?: string;
      rowspan?: number | string;
      scope?: 'col' | 'colgroup' | 'row' | 'rowgroup' | string;
    };
    'ore-td': HTMLElement & {
      colspan?: number | string;
      headers?: string;
      rowspan?: number | string;
    };
    // disclosure
    'ore-accordion': HTMLElement & OreAccordionProps & AddEventListeners<OreAccordionEvents>;
    'ore-accordion-item': HTMLElement & OreAccordionItemProps & AddEventListeners<OreAccordionItemEvents>;
    'ore-tab-item': HTMLElement & OreTabItemProps;
    'ore-tab-panel': HTMLElement & OreTabPanelProps;
    'ore-tabs': HTMLElement & OreTabsProps & AddEventListeners<OreTabsEvents>;
    // feedback
    'ore-alert': HTMLElement & OreAlertProps & AddEventListeners<OreAlertEvents>;
    'ore-async': HTMLElement & OreAsyncProps & AddEventListeners<OreAsyncEvents>;
    'ore-badge': HTMLElement & OreBadgeProps;
    'ore-chip': HTMLElement & OreChipProps & AddEventListeners<OreChipEvents>;
    'ore-password-strength': HTMLElement & OrePasswordStrengthProps;
    'ore-progress': HTMLElement & OreProgressProps;
    'ore-skeleton': HTMLElement & OreSkeletonProps;
    'ore-toast': ToastElement;
    // inputs
    'ore-button': HTMLElement & OreButtonProps;
    'ore-button-group': HTMLElement & OreButtonGroupProps;
    'ore-calendar': HTMLElement & OreCalendarProps & AddEventListeners<OreCalendarEvents>;
    'ore-checkbox': HTMLElement & OreCheckboxProps & FormValidityMethods & AddEventListeners<OreCheckboxEvents>;
    'ore-checkbox-group': HTMLElement &
      OreCheckboxGroupProps &
      FormValidityMethods &
      AddEventListeners<OreCheckboxGroupEvents>;
    'ore-combobox': HTMLElement & OreComboboxProps & FormValidityMethods & AddEventListeners<OreComboboxEvents>;
    'ore-combobox-option': HTMLElement & OreComboboxOptionProps;
    'ore-column': HTMLElement;
    'ore-datagrid': HTMLElement & OreDataGridProps & AddEventListeners<OreDataGridEvents>;
    'ore-date-picker': HTMLElement & OreDatePickerProps & AddEventListeners<OreDatePickerEvents>;
    'ore-file-input': HTMLElement & OreFileInputProps & FormValidityMethods & AddEventListeners<OreFileInputEvents>;
    'ore-form': HTMLElement & OreFormProps & AddEventListeners<OreFormEvents>;
    'ore-input': HTMLElement & OreInputProps & FormValidityMethods & AddEventListeners<OreInputEvents>;
    'ore-message-composer': HTMLElement &
      OreMessageComposerProps &
      FormValidityMethods &
      AddEventListeners<OreMessageComposerEvents>;
    'ore-number-input': HTMLElement &
      OreNumberInputProps &
      FormValidityMethods &
      AddEventListeners<OreNumberInputEvents>;
    'ore-otp-input': HTMLElement & OreOtpInputProps & AddEventListeners<OreOtpInputEvents>;
    'ore-radio': HTMLElement & OreRadioProps & FormValidityMethods & AddEventListeners<OreRadioEvents>;
    'ore-radio-group': HTMLElement & OreRadioGroupProps & FormValidityMethods & AddEventListeners<OreRadioGroupEvents>;
    'ore-rating': HTMLElement & OreRatingProps & FormValidityMethods & AddEventListeners<OreRatingEvents>;
    'ore-select': HTMLElement & OreSelectProps & FormValidityMethods & AddEventListeners<OreSelectEvents>;
    'ore-slider': HTMLElement & OreSliderProps & FormValidityMethods & AddEventListeners<OreSliderEvents>;
    'ore-switch': HTMLElement & OreSwitchProps & FormValidityMethods & AddEventListeners<OreSwitchEvents>;
    'ore-textarea': HTMLElement & OreTextareaProps & FormValidityMethods & AddEventListeners<OreTextareaEvents>;
    'ore-time-picker': HTMLElement & OreTimePickerProps & AddEventListeners<OreTimePickerEvents>;
    // layout
    'ore-box': HTMLElement & OreBoxProps;
    'ore-grid': HTMLElement & OreGridProps;
    'ore-grid-item': HTMLElement & OreGridItemProps;
    'ore-navbar': NavbarElement & AddEventListeners<OreNavbarEvents>;
    'ore-navbar-item': HTMLElement & OreNavbarItemProps;
    'ore-sidebar': SidebarElement & AddEventListeners<OreSidebarEvents>;
    'ore-sidebar-group': HTMLElement & OreSidebarGroupProps & AddEventListeners<OreSidebarGroupEvents>;
    'ore-sidebar-item': HTMLElement & OreSidebarItemProps;
    // overlay
    'ore-dialog': HTMLElement & OreDialogProps & AddEventListeners<OreDialogEvents>;
    'ore-drawer': DrawerElement & AddEventListeners<OreDrawerEvents>;
    'ore-menu': HTMLElement & OreMenuProps & AddEventListeners<OreMenuEvents>;
    'ore-menu-item': HTMLElement & OreMenuItemProps;
    'ore-menu-separator': HTMLElement;
    'ore-popover': HTMLElement & OrePopoverProps & AddEventListeners<OrePopoverEvents>;
    'ore-tooltip': HTMLElement & OreTooltipProps;
  }
}
