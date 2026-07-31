/**
 * Assembles the HTML body handed to `sandbox.render()` (see useReplExecution.ts) for a
 * single REPL run.
 *
 * Everything the run needs — the selected library's dependency chain and the user's
 * (already transpiled + import-rewritten) code — is embedded as plain inline `<script>`
 * text. Nothing is fetched over the network: the sandbox's CSP defaults to
 * `connect-src 'none'` and `script-src 'unsafe-inline'` with no external origins allowed.
 * Courier examples that target `https://api.example.com` are handled by an in-sandbox
 * fetch mock, so they still run without punching holes in CSP. Because
 * `sandbox.render()` replaces the whole iframe document on every run, each run gets a
 * fresh `window` — library globals and any timers/intervals the user's code started are
 * gone the moment the next run replaces the document. No manual cleanup bookkeeping needed
 * on the host side (contrast with the old approach of running code via `new
 * Function(...).call(window)` directly on the host page, which leaked globals and timers
 * across runs — see git history).
 */

export interface SandboxLibrary {
  /** The `window.<GlobalName>` the library's IIFE bundle exposes inside the sandbox. */
  globalName: string;
  /** Full source of the library's IIFE build (`packages/<name>/dist/<name>.iife.js`). */
  iifeSource: string;
}

// The HTML tokenizer ends a <script> block at the first literal "</script" byte sequence,
// regardless of JS syntax (strings, comments, regexes — it doesn't parse JS at all). Our own
// package bundles will never contain that sequence, but arbitrary user-typed REPL code could
// (e.g. a string literal containing "</script>"). Splitting the sequence keeps the HTML parser
// from ending the block early; it's a defense-in-depth measure for HTML-injection inside the
// already fully-isolated (no storage, no network, opaque-origin) sandbox iframe, not a claim
// that it's exploitable — worst case without it is inert HTML text leaking into the iframe body.
function escapeScriptClose(source: string): string {
  return source.replace(/<\/script/gi, '<\\/script');
}

function inlineScript(source: string): string {
  return `<script>\n${escapeScriptClose(source)}\n</script>`;
}

// The sandbox iframe has `sandbox="allow-scripts"` with no `allow-same-origin` — an opaque
// origin, deliberately, so untrusted REPL code can never touch the docs site's real
// cookies/storage. One side effect: `window.localStorage`/`sessionStorage` throw a
// SecurityError in that context (this is the browser enforcing the isolation, not a bug in
// the sandbox or in @vielzeug/vault, which reports it as "not available in this environment
// (private browsing or sandboxed iframe?)"). Examples that demonstrate vault's storage
// adapters need *some* Storage-shaped object to write to, so each run gets a throwaway
// in-memory one instead of real browser storage. It behaves like Storage for the duration of
// the run and is gone with the rest of the iframe afterwards — consistent with every other
// run boundary in this sandbox (see the module doc comment above).
const STORAGE_POLYFILL_SCRIPT = `
function __replMemoryStorage() {
  var store = new Map();
  return {
    clear: function () { store.clear(); },
    getItem: function (key) { return store.has(key) ? store.get(key) : null; },
    key: function (index) { return Array.from(store.keys())[index] ?? null; },
    get length() { return store.size; },
    removeItem: function (key) { store.delete(key); },
    setItem: function (key, value) { store.set(String(key), String(value)); },
  };
}
['localStorage', 'sessionStorage'].forEach(function (name) {
  try {
    window[name].setItem('__repl_probe__', '1');
    window[name].removeItem('__repl_probe__');
  } catch {
    Object.defineProperty(window, name, { configurable: true, value: __replMemoryStorage(), writable: true });
  }
});
`;

// Courier examples intentionally use https://api.example.com as a placeholder backend.
// In the REPL that endpoint should stay offline: we mock those calls in-place and keep
// CSP's connect-src 'none'. Requests to other origins fall through to native fetch.
const FETCH_MOCK_SCRIPT = `
var __replNativeFetch = typeof window.fetch === 'function' ? window.fetch.bind(window) : null;
var __replMockUserId = 2;
var __replMockPollCount = 0;

function __replJson(data, status) {
  return new Response(JSON.stringify(data), {
    headers: { 'content-type': 'application/json' },
    status: status || 200,
  });
}

function __replSse(roomId) {
  return new Response(
    'event: message\\n' +
      'data: ' +
      JSON.stringify({ roomId: roomId || 'general', text: 'Welcome to courier events.', userId: 'system' }) +
      '\\n\\n',
    { headers: { 'content-type': 'text/event-stream' } },
  );
}

function __replNdjson() {
  return new Response(
    '{"done":false,"delta":"Query handles cache by key. "}\\n' +
      '{"done":false,"delta":"Mutations invalidate stale entries. "}\\n' +
      '{"done":true,"delta":""}\\n',
    { headers: { 'content-type': 'application/x-ndjson' } },
  );
}

window.fetch = async function (input, init) {
  var method = ((init && init.method) || (input && input.method) || 'GET').toUpperCase();
  var rawUrl = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input && input.url;

  if (!rawUrl) {
    if (__replNativeFetch) return __replNativeFetch(input, init);
    throw new TypeError('Failed to fetch');
  }

  try {
    var url = new URL(rawUrl, 'https://api.example.com');

    if (url.origin !== 'https://api.example.com') {
      if (__replNativeFetch) return __replNativeFetch(input, init);
      throw new TypeError('Failed to fetch');
    }

    if (method === 'GET' && url.pathname === '/users') {
      return __replJson([
        { id: 1, name: 'Ada' },
        { id: 2, name: 'Linus' },
      ]);
    }

    if (method === 'GET' && /^\\/users\\/\\d+$/.test(url.pathname)) {
      return __replJson({ id: 1, name: 'Ada' });
    }

    if (method === 'POST' && url.pathname === '/users') {
      __replMockUserId += 1;
      var body = null;

      try {
        body = init && typeof init.body === 'string' ? JSON.parse(init.body) : null;
      } catch {
        body = null;
      }

      return __replJson({ id: __replMockUserId, name: (body && body.name) || 'New user' }, 201);
    }

    if (method === 'PATCH' && /^\\/users\\/\\d+$/.test(url.pathname)) {
      var patchBody = null;

      try {
        patchBody = init && typeof init.body === 'string' ? JSON.parse(init.body) : null;
      } catch {
        patchBody = null;
      }

      return __replJson({ id: 1, name: (patchBody && patchBody.name) || 'Updated name' });
    }

    if (method === 'GET' && /^\\/jobs\\//.test(url.pathname)) {
      __replMockPollCount += 1;
      return __replJson({
        id: url.pathname.split('/').pop() || 'job-42',
        status: __replMockPollCount > 1 ? 'complete' : 'running',
      });
    }

    if (method === 'POST' && url.pathname === '/upload') {
      return __replJson({ url: 'https://cdn.example.com/uploads/profile.txt' });
    }

    if (method === 'GET' && url.pathname === '/profile') {
      return __replJson({ id: 1, name: 'Ada', role: 'admin' });
    }

    if (method === 'GET' && url.pathname === '/events') {
      return __replSse(url.searchParams.get('roomId') || 'general');
    }

    if (method === 'POST' && url.pathname === '/chat') {
      return __replNdjson();
    }

    return __replJson({ message: 'Not found' }, 404);
  } catch {
    if (__replNativeFetch) return __replNativeFetch(input, init);
    throw new TypeError('Failed to fetch');
  }
};
`;

// @vielzeug/sandbox's own bridge script — the thing that defines `window.__sandbox__` — is
// appended by buildDocument() *after* the body content passed to render() (i.e. after
// everything below). So `window.__sandbox__` does not exist yet while our library scripts,
// console overrides, and the user's code are still executing synchronously — any user
// snippet that calls console.log() before its first `await` would hit `__sandbox__` as
// undefined. Emitting messages by hand via the same postMessage shape the bridge itself
// uses (see @vielzeug/sandbox's internal `post()`) sidesteps that ordering dependency
// entirely: it only needs `window.__sandboxGeneration`, which render() sets in <head> —
// always before any body script runs.
const EMIT_HELPER_SCRIPT = `
function __replEmit(event, detail) {
  parent.postMessage({ type: 'custom', event: event, detail: detail, generation: window.__sandboxGeneration }, '*');
}
`;

// Runs inside the sandbox iframe. Overrides console methods so REPL output reaches the host
// via the same custom-message channel as __sandbox__.emit(). Values are passed through
// `structuredClone` first (the same algorithm `postMessage` itself uses) so anything that
// can't cross the boundary — functions, DOM nodes — degrades to its string form instead of
// silently dropping the whole console call.
const CONSOLE_BRIDGE_SCRIPT = `
function __replSafe(value) {
  try {
    structuredClone(value);
    return value;
  } catch {
    return String(value);
  }
}
['log', 'warn', 'error'].forEach(function (level) {
  console[level] = function (...args) {
    __replEmit('repl:console', { level, parts: args.map(__replSafe) });
  };
});
`;

function buildRunScript(code: string): string {
  return `
(async function () {
${code}
})().then(function (result) {
  if (result !== undefined) __replEmit('repl:result', __replSafe(result));
}).finally(function () {
  __replEmit('repl:done');
});
`;
}

// Deliberate tradeoff: every run re-parses and re-executes the full IIFE source of the
// selected library and all its transitive @vielzeug dependencies (e.g. flux pulls in
// ripple + arsenal + herald + pulse + courier + itself) — there's no cross-run caching,
// because a fresh iframe is what makes cross-run isolation free (see the module doc
// comment). Fine at today's bundle sizes (tens of KB, sub-frame to parse+eval); revisit
// with a "keep dependency bundles warm across runs" strategy if that ever changes.
export function buildSandboxRunHtml(params: { code: string; libraries: SandboxLibrary[] }): string {
  const libraryScripts = params.libraries.map((lib) => inlineScript(lib.iifeSource)).join('\n');

  return [
    inlineScript(EMIT_HELPER_SCRIPT),
    inlineScript(STORAGE_POLYFILL_SCRIPT),
    inlineScript(FETCH_MOCK_SCRIPT),
    libraryScripts,
    inlineScript(CONSOLE_BRIDGE_SCRIPT),
    inlineScript(buildRunScript(params.code)),
  ].join('\n');
}
