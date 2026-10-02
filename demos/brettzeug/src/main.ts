import '@vielzeug/refine/fouc.css';
import '@vielzeug/refine/tokens.css';
import './styles/app.css';
import { createAppShell } from './ui/app-shell';

const app = document.getElementById('app');

if (app) app.appendChild(createAppShell());
