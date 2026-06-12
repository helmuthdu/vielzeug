/** @type {import('stylelint').Config} */
export default {
  extends: ['stylelint-config-recess-order', 'stylelint-config-standard'],
  ignoreFiles: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/lib/**', '**/public/**'],
  plugins: ['stylelint-use-logical-spec'],
  rules: {
    'at-rule-no-unknown': null,
    'custom-property-pattern': null,
    // Shadow DOM component stylesheets use :host() selectors with intentional
    // specificity ordering (e.g. base styles followed by state/variant overrides).
    // Cross-variant selectors (e.g. :host([variant='bordered']) vs :host([variant='flat']))
    // are mutually exclusive and can never apply to the same element simultaneously,
    // making the no-descending-specificity rule produce false positives here.
    'no-descending-specificity': null,
  },
};
