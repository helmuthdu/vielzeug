/** @type {import('stylelint').Config} */

export default {
  extends: ['stylelint-config-recess-order', 'stylelint-config-standard'],
  ignoreFiles: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/lib/**', '**/public/**'],
  plugins: ['stylelint-use-logical-spec'],
  rules: {
    'at-rule-no-unknown': null
  }
};
