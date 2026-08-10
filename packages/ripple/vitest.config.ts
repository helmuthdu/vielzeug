/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

// Ripple is platform-neutral: test its scheduler, AbortController lifecycle, and async error
// semantics under Node. Browser-specific behavior belongs in a separate test project only if the
// runtime ever acquires a browser API dependency.
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    name: 'ripple',
    watch: false,
  },
});
