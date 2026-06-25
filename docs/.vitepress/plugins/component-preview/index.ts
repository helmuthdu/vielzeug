// component-preview — Vite plugin barrel
//
// Node-side only. Register this plugin in your VitePress (or Vite) config
// to expose the refine-preview:* virtual modules consumed by the Vue component:
//
//   import { componentPreviewPlugin } from './.vitepress/plugins/component-preview';
//   plugins: [componentPreviewPlugin()]
//
// The Vue component and its runtime utilities live in:
//   theme/components/component-preview/

export { componentPreviewPlugin } from './plugin';
