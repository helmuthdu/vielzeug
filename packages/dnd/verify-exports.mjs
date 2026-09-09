import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const modules = [
  [await import('./dist/index.js'), await import('./dist/drop.js'), await import('./dist/sortable.js')],
  [require('./dist/index.cjs'), require('./dist/drop.cjs'), require('./dist/sortable.cjs')],
];

for (const [root, drop, sortable] of modules) {
  if (drop.createDropZone !== root.createDropZone || sortable.createSortable !== root.createSortable) {
    throw new Error('subpath export identity mismatch');
  }
  if (drop.DndError !== root.DndError || sortable.DndScopeError !== root.DndScopeError) {
    throw new Error('subpath error identity mismatch');
  }

  const error = new sortable.DndScopeError();
  if (!(error instanceof root.DndError) || error.name !== 'DndScopeError') {
    throw new Error('DndScopeError contract mismatch');
  }

  try {
    sortable.applyReorder(
      [
        { id: 'duplicate', value: 1 },
        { id: 'duplicate', value: 2 },
      ],
      ['duplicate'],
      (item) => item.id,
    );
    throw new Error('expected duplicate keys to reject');
  } catch (reason) {
    if (!(reason instanceof root.DndError)) throw reason;
  }
}
