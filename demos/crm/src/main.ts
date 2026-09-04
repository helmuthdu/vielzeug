import '@vielzeug/refine/tokens.css';
import '@vielzeug/prism/theme';
import './styles/app.css';
import { setupOfflineSync } from './core/offline';
import { setupPersistence } from './core/persistence';
import { setupRealtime } from './core/realtime';
import { createAppShell } from './ui/app-shell';

async function main(): Promise<void> {
  await setupPersistence();
  await setupOfflineSync();
  setupRealtime();
  document.getElementById('app')!.appendChild(createAppShell());
}

void main();
