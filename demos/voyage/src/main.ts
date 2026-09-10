import '@vielzeug/refine/tokens.css';
import './styles/app.css';
import { createAppShell } from './ui/app-shell';

document.getElementById('app')?.appendChild(createAppShell());
