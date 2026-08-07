import '@vielzeug/refine/tokens.css';
import '@vielzeug/prism/theme';

import './styles/app.css';
import { setupPersistence } from './core/persistence';
import { createAppShell } from './ui/app-shell';

/**
 * `router` (core/router.ts) resolves the browser's actual current path the moment it's
 * constructed; it must not receive a forced initial navigation. `setupPersistence()`'s await
 * gives that construction-time resolution ample time to land before app-shell reads
 * `activeRoute.value` for the first time — same reasoning as demos/kanban/src/main.ts.
 */
async function main(): Promise<void> {
  await setupPersistence();

  const app = document.getElementById('app')!;

  app.appendChild(createAppShell());
}

main().catch(console.error);
