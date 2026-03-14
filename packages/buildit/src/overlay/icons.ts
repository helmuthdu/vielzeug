import { html } from '@vielzeug/craftit';

/**
 * Close (×) icon shared by overlay components (dialog, drawer).
 * Composable in any `html` tagged template via interpolation.
 */
export const closeIcon = html`
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
`;
