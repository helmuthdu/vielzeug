/**
 * Global HTMLElementTagNameMap augmentations for all buildit custom elements.
 * This file is the single source of truth for element type registrations.
 */

export {};

declare global {
  interface HTMLElementTagNameMap {
    // content
    'bit-avatar': HTMLElement & BitAvatarProps;
    'bit-avatar-group': HTMLElement & BitAvatarGroupProps;
    'bit-breadcrumb': HTMLElement & BitBreadcrumbProps;
    'bit-breadcrumb-item': HTMLElement & BitBreadcrumbItemProps;
    'bit-card': HTMLElement & BitCardProps & AddEventListeners<BitCardEvents>;
    'bit-icon': HTMLElement & BitIconProps;
    'bit-pagination': HTMLElement & BitPaginationProps & AddEventListeners<BitPaginationEvents>;
    'bit-separator': HTMLElement & BitSeparatorProps;
    'bit-table': HTMLElement & BitTableProps;
    'bit-text': HTMLElement & BitTextProps;
    // table markers (light-DOM authoring API used by bit-table)
    'bit-tr': HTMLElement & { foot?: boolean; head?: boolean };
    'bit-th': HTMLElement & {
      abbr?: string;
      axis?: string;
      colspan?: number | string;
      headers?: string;
      rowspan?: number | string;
      scope?: 'col' | 'colgroup' | 'row' | 'rowgroup' | string;
    };
    'bit-td': HTMLElement & {
      colspan?: number | string;
      headers?: string;
      rowspan?: number | string;
    };
    // disclosure
    'bit-accordion': HTMLElement & BitAccordionProps & AddEventListeners<BitAccordionEvents>;
    'bit-accordion-item': HTMLElement & BitAccordionItemProps & AddEventListeners<BitAccordionItemEvents>;
    'bit-tab-item': HTMLElement & BitTabItemProps;
    'bit-tab-panel': HTMLElement & BitTabPanelProps;
    'bit-tabs': HTMLElement & BitTabsProps & AddEventListeners<BitTabsEvents>;
    // feedback
    'bit-alert': HTMLElement & BitAlertProps & AddEventListeners<BitAlertEvents>;
    'bit-badge': HTMLElement & BitBadgeProps;
    'bit-chip': HTMLElement & BitChipProps & AddEventListeners<BitChipEvents>;
    'bit-progress': HTMLElement & BitProgressProps;
    'bit-skeleton': HTMLElement & BitSkeletonProps;
    'bit-toast': ToastElement;
    // inputs
    'bit-button': HTMLElement & BitButtonProps;
    'bit-button-group': HTMLElement & BitButtonGroupProps;
    'bit-checkbox': HTMLElement & BitCheckboxProps & FormValidityMethods & AddEventListeners<BitCheckboxEvents>;
    'bit-checkbox-group': HTMLElement & BitCheckboxGroupProps;
    'bit-combobox': HTMLElement & BitComboboxProps & FormValidityMethods & AddEventListeners<BitComboboxEvents>;
    'bit-combobox-option': HTMLElement & BitComboboxOptionProps;
    'bit-file-input': HTMLElement & BitFileInputProps & FormValidityMethods & AddEventListeners<BitFileInputEvents>;
    'bit-form': HTMLElement & BitFormProps & AddEventListeners<BitFormEvents>;
    'bit-input': HTMLElement & BitInputProps & FormValidityMethods & AddEventListeners<BitInputEvents>;
    'bit-number-input': HTMLElement &
      BitNumberInputProps &
      FormValidityMethods &
      AddEventListeners<BitNumberInputEvents>;
    'bit-otp-input': HTMLElement & BitOtpInputProps & AddEventListeners<BitOtpInputEvents>;
    'bit-radio': HTMLElement & BitRadioProps & FormValidityMethods & AddEventListeners<BitRadioEvents>;
    'bit-radio-group': HTMLElement & BitRadioGroupProps;
    'bit-rating': HTMLElement & BitRatingProps & FormValidityMethods & AddEventListeners<BitRatingEvents>;
    'bit-select': HTMLElement & BitSelectProps & FormValidityMethods & AddEventListeners<BitSelectEvents>;
    'bit-slider': HTMLElement & BitSliderProps & FormValidityMethods & AddEventListeners<BitSliderEvents>;
    'bit-switch': HTMLElement & BitSwitchProps & FormValidityMethods & AddEventListeners<BitSwitchEvents>;
    'bit-textarea': HTMLElement & BitTextareaProps & FormValidityMethods & AddEventListeners<BitTextareaEvents>;
    // layout
    'bit-box': HTMLElement & BitBoxProps;
    'bit-grid': HTMLElement & BitGridProps;
    'bit-grid-item': HTMLElement & BitGridItemProps;
    'bit-sidebar': SidebarElement & AddEventListeners<BitSidebarEvents>;
    'bit-sidebar-group': HTMLElement & BitSidebarGroupProps & AddEventListeners<BitSidebarGroupEvents>;
    'bit-sidebar-item': HTMLElement & BitSidebarItemProps;
    // overlay
    'bit-dialog': HTMLElement & BitDialogProps & AddEventListeners<BitDialogEvents>;
    'bit-drawer': DrawerElement & AddEventListeners<BitDrawerEvents>;
    'bit-menu': HTMLElement & BitMenuProps & AddEventListeners<BitMenuEvents>;
    'bit-menu-item': HTMLElement & BitMenuItemProps;
    'bit-menu-separator': HTMLElement;
    'bit-popover': HTMLElement & BitPopoverProps & AddEventListeners<BitPopoverEvents>;
    'bit-tooltip': HTMLElement & BitTooltipProps;
  }
}
