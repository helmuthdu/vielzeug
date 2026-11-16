import '@vielzeug/refine/fouc.css';
import '@vielzeug/refine/tokens.css';
import type {} from '@vielzeug/refine/frameworks/elements';
import './styles/app.css';
import { mountBoardScene } from './ui/board-scene.ts';
import { mountFlowScene } from './ui/flow-scene.ts';
import { mountPaletteScene } from './ui/palette-scene.ts';

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('Studio requires a #app root element');

const scenes: Readonly<Record<string, (container: HTMLElement) => { dispose(): void }>> = {
  board: mountBoardScene,
  flow: mountFlowScene,
  palette: mountPaletteScene,
};

const sceneName = window.location.hash.replace(/^#\/?/, '') || 'board';
const mount = scenes[sceneName] ?? scenes.board;
if (!mount) throw new Error(`Unknown studio scene: ${sceneName}`);

const scene = mount(app);

window.addEventListener('beforeunload', () => scene.dispose(), { once: true });
