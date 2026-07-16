import '@vielzeug/refine/styles/styles.css';
import '@vielzeug/prism/theme';
import { createTouchDragShim } from '@vielzeug/dnd';

import './styles/app.css';
import { createAppShell } from './ui/app-shell';

// Lives for the app's whole lifetime — no teardown path in this demo, same as setupRealtime().
createTouchDragShim();
import { setupPersistence } from './core/persistence';

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
