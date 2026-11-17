import '@vielzeug/refine/fouc.css';
import '@vielzeug/refine/tokens.css';
import type {} from '@vielzeug/refine/frameworks/elements';
import './styles/app.css';
import { mountBoardScene } from './ui/board-scene.ts';
import { mountFlowScene } from './ui/flow-scene.ts';
import { mountMapScene } from './ui/map-scene.ts';
import { mountPaletteScene } from './ui/palette-scene.ts';
import { createShell, type SceneHandle, type SceneInfo } from './ui/shell.ts';

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('Studio requires a #app root element');

const scenes: Readonly<Record<string, (container: HTMLElement) => SceneHandle>> = {
  board: mountBoardScene,
  flow: mountFlowScene,
  map: mountMapScene,
  palette: mountPaletteScene,
};

app.classList.add('studio-app');

const shellRoot = document.createElement('div');
shellRoot.className = 'studio-shell-root';
const sceneContainer = document.createElement('main');
sceneContainer.className = 'studio-scene';
sceneContainer.dataset.testid = 'scene';
shellRoot.append(sceneContainer);
app.append(shellRoot);

const shell = createShell();
shellRoot.append(shell.root);

let scene: SceneHandle | null = null;

function sceneInfo(name: string): SceneInfo {
  const label = name.charAt(0).toUpperCase() + name.slice(1);
  return { href: `#/${name}`, label };
}

function routeName(): string {
  const name = window.location.hash.replace(/^#\/?/, '');
  return name in scenes ? name : 'board';
}

function navigate(): void {
  const name = routeName();
  scene?.dispose();
  shell.attachCamera(null);
  const mount = scenes[name];
  if (!mount) throw new Error(`Unknown studio scene: ${name}`);
  scene = mount(sceneContainer);
  shell.setScene(sceneInfo(name));
  shell.attachCamera(scene.camera ?? null, scene.fit ?? null);
}

window.addEventListener('hashchange', navigate);
window.addEventListener('beforeunload', () => {
  scene?.dispose();
  shell.dispose();
});

navigate();
