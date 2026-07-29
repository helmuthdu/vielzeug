/// <reference types="vite/client" />

// `@vielzeug/prism/theme` is a package subpath export that resolves to a plain CSS file. TS's
// ambient `*.css` module declarations from `vite/client` match against the literal import
// specifier text, which only works for specifiers that themselves end in `.css` (e.g.
// `@vielzeug/refine/styles/styles.css`) — this extensionless subpath needs its own declaration
// for the side-effect import in main.ts. Mirrors demos/kanban/src/vite-env.d.ts.
declare module '@vielzeug/prism/theme';
