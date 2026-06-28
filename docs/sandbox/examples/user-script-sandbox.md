## User Script Sandbox

Run user-provided code with error boundaries and console output capture, keeping the host page safe from untrusted execution.

### Problem

You're building a code playground or evaluation tool. Users type arbitrary JavaScript that you need to execute, capture `console.log` output from, and display errors for — all without risking access to host-page cookies, storage, or the DOM.

### Solution

```ts
import { createSandbox } from '@vielzeug/sandbox';

interface RunResult {
  logs: string[];
  error: string | null;
}

function createScriptSandbox(container: HTMLElement) {
  const sandbox = createSandbox(container, {
    namedStyles: { base: 'body { margin: 0; display: none; }' }, // no visible output area needed
  });

  return {
    async run(userCode: string): Promise<RunResult> {
      const logs: string[] = [];
      let error: string | null = null;

      const unsub = sandbox.onMessage((msg) => {
        if (msg.type === 'custom' && msg.event === 'log') {
          logs.push(String(msg.detail));
        }
        if (msg.type === 'error') {
          error = msg.message;
        }
      });

      // Wrap user code: redirect console.log through the bridge
      const wrapped = `
        const _log = console.log;
        console.log = (...args) => {
          window.__sandbox__.emit('log', args.map(String).join(' '));
          _log(...args);
        };
        try {
          ${userCode}
        } finally {
          console.log = _log;
        }
      `;

      await sandbox.render(`<script>${wrapped}</script>`);

      unsub();
      return { error, logs };
    },
    [Symbol.dispose]() {
      sandbox.dispose();
    },
  };
}

// Usage
using runner = createScriptSandbox(document.getElementById('output')!);

const { logs, error } = await runner.run(`
  const nums = [1, 2, 3, 4, 5];
  const sum = nums.reduce((a, b) => a + b, 0);
  console.log('Sum:', sum);
  console.log('Average:', sum / nums.length);
`);

console.log(logs);  // ['Sum: 15', 'Average: 3']
console.log(error); // null
```

### Pitfalls

- **`allow-scripts` only** — the sandbox attribute is `sandbox="allow-scripts"` with nothing else. User code cannot open popups, access top-level navigation, or use `localStorage`. Network access is blocked by the CSP (`connect-src 'none'`).
- **Script errors are forwarded, not thrown** — `msg.type === 'error'` fires for uncaught errors and unhandled promise rejections. Subscribe before calling `render()`.
- **Each `render()` is a fresh document** — there is no shared state between runs. Variables from a previous run do not persist.
- **Treat `msg.detail` as untrusted** — user code controls what is emitted via `window.__sandbox__.emit`. Validate or sanitize before displaying.

### Related

- [Usage Guide — Handling Errors](../usage.md#handling-errors)
- [Usage Guide — Receiving Events from the Sandbox](../usage.md#receiving-events-from-the-sandbox)
- [Usage Guide — Awaiting Subsequent Renders](../usage.md#awaiting-subsequent-renders)
- [API Reference — SandboxBridge](../api.md#sandboxbridge)
