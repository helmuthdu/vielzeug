import '@vielzeug/refine/tokens.css';
import './styles/app.css';
import { createAppShell } from './ui/app-shell';

const app = document.getElementById('app');

void Promise.all([import('@vielzeug/refine/grid'), import('@vielzeug/refine/sidebar')])
  .then(() => app?.appendChild(createAppShell()))
  .catch(() => {
    if (app) app.textContent = 'Unable to load Voyage.';
  });
