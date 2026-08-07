import '@vielzeug/refine/tokens.css';
import '@vielzeug/prism/theme';

import './styles/app.css';
import { setupPersistence } from './core/persistence';
import { createAppShell } from './ui/app-shell';

// `router` (core/router.ts) resolves the browser's actual current path — including the
// `/` → `board` redirect — the moment it's constructed; it does not need (and must never
// receive) a forced initial navigation. Doing so used to always land on Board regardless of
// the real URL, breaking refresh and deep links to every other view. `setupPersistence()`'s
// await gives that construction-time resolution ample time to land before app-shell reads
// `router.getSnapshot()`.
async function main(): Promise<void> {
  await setupPersistence();

  const app = document.getElementById('app')!;

  app.appendChild(createAppShell());
}

main().catch(console.error);
