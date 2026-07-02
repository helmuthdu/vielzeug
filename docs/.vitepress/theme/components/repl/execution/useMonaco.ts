/**
 * Monaco is loaded as a real bundled dependency (see package.json) instead of injecting a
 * `<script>` tag pointing at a CDN at runtime — that gave the REPL a hard runtime
 * dependency on unpkg being reachable, no offline dev, and an unpinned "whatever unpkg
 * serves today" version. Workers are wired via Vite's documented `?worker` import pattern.
 *
 * Everything Monaco-related is imported dynamically behind `loadMonaco()`'s cached promise
 * rather than statically at module scope — Monaco is large, and the REPL page is the only
 * page in the docs site that needs it. A dynamic import gives Vite an explicit chunk
 * boundary to split it into, regardless of how this module happens to get bundled.
 */
import type * as Monaco from 'monaco-editor';

// This version of monaco-editor injects its own CSS via JS at runtime (no separate
// stylesheet to import) — nothing to pull in here beyond the modules below.

let monacoPromise: Promise<typeof Monaco> | null = null;

/** Loads Monaco, wires up its web workers, and configures the TS compiler exactly once. */
export function loadMonaco(): Promise<typeof Monaco> {
  monacoPromise ??= (async () => {
    const [monaco, { default: EditorWorker }, { default: TsWorker }] = await Promise.all([
      import('monaco-editor'),
      import('monaco-editor/esm/vs/editor/editor.worker?worker'),
      import('monaco-editor/esm/vs/language/typescript/ts.worker?worker'),
    ]);

    self.MonacoEnvironment = {
      getWorker(_workerId: string, label: string) {
        return label === 'typescript' || label === 'javascript' ? new TsWorker() : new EditorWorker();
      },
    };

    // Module stays ESNext (not CommonJS) so emitted JS keeps `import`/`export` syntax —
    // rewriteVielzeugImports() expects to see real import statements to translate.
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      allowNonTsExtensions: true,
      esModuleInterop: true,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      target: monaco.languages.typescript.ScriptTarget.ESNext,
    });

    return monaco;
  })();

  return monacoPromise;
}

/**
 * Compiles a TypeScript model's current content to plain JS using Monaco's own TypeScript
 * worker — the real compiler, not a regex approximation of one. Type errors don't block
 * emit (`noEmitOnError` defaults to false): the REPL erases types and runs the result,
 * the same permissive "just run it" behaviour a Babel-style playground would give.
 */
export async function transpileTypeScript(monaco: typeof Monaco, model: Monaco.editor.ITextModel): Promise<string> {
  const workerFactory = await monaco.languages.typescript.getTypeScriptWorker();
  const client = await workerFactory(model.uri);
  const { outputFiles } = await client.getEmitOutput(model.uri.toString());
  const jsFile = outputFiles.find((file) => file.name.endsWith('.js'));

  if (!jsFile) throw new Error('TypeScript transpile produced no JavaScript output.');

  return jsFile.text;
}
