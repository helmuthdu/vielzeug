export default {
  /** Globs to analyze */
  globs: ['src/**/*.ts'],
  /** Globs to exclude */
  exclude: [
    'src/**/*.test.ts',
    'src/**/__tests__/**',
    'src/utils/**',
    'src/**/index.ts', // Exclude index files (re-exports only)
    'src/types/**', // Exclude type definitions
    'src/styles/**', // Exclude style utilities
  ],
  /** Directory to output CEM to */
  outdir: 'dist',
  /** Run in dev mode, provides extra logging */
  dev: false,
  /** Run in watch mode, runs on file changes */
  watch: false,
  /**
   * Disable third-party manifest scanning.
   * The upstream dependency scanner resolves initial relative imports from the
   * package root instead of each source file directory, which produces a large
   * volume of false "Cannot resolve ..." warnings for buildit.
   */
  dependencies: false,
  /** Output CEM path to `package.json`, defaults to true */
  packagejson: true,
  /** Enable special handling for litelement */
  litelement: false,
  /** Enable special handling for catalyst */
  catalyst: false,
  /** Enable special handling for fast */
  fast: false,
  /** Enable special handling for stencil */
  stencil: false,
  /** Provide custom plugins */
  plugins: [],
};
