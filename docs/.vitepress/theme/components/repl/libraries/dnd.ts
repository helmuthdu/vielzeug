export const description = 'Drag-and-drop primitives with file filtering and more.';

export const loader = () => import('@vielzeug/dnd');

export const apiExports = ['createDropZone', 'createSortable', 'createSortableScope', 'applyReorder'] as const;
