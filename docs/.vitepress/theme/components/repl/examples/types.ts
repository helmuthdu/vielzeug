/** Shape every REPL example module exports. Single source of truth for both the browser-side
 * registry (`examples/index.ts`, consumed by REPLEditor.vue) and `scripts/validate-repl.ts`'s
 * Node-side test generation. */
export interface ExampleModule {
  code: string;
  name: string;
  /** Skips this example in `validate-repl.ts` — it needs a real browser API (Worker, etc.) that
   * Node/jsdom can't provide. Has no effect on the REPL itself, which always runs in a browser. */
  browserOnly?: boolean;
}
