import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const modules = [await import('./dist/index.js'), require('./dist/index.cjs')];

for (const focus of modules) {
  if (
    typeof focus.createListNavigation !== 'function' ||
    typeof focus.captureFocus !== 'function' ||
    typeof focus.restoreFocus !== 'function'
  ) {
    throw new Error('Focus export mismatch');
  }

  const navigation = focus.createListNavigation({ getItems: () => ['first', 'second'] });
  const change = navigation.navigate('next');
  if (change?.item !== 'first' || 'dispose' in navigation) throw new Error('List navigation artifact mismatch');
}
