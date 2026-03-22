import { CF_ID_ATTR } from './internal';

export type BindingTargets = {
  comments: Map<string, Comment>;
  elements: Map<string, HTMLElement>;
};

const templateCache = new Map<string, HTMLTemplateElement>();

const getCachedTemplate = (html: string): HTMLTemplateElement => {
  let tpl = templateCache.get(html);

  if (!tpl) {
    tpl = document.createElement('template');
    tpl.innerHTML = html;
    templateCache.set(html, tpl);
  }

  return tpl;
};

export const parseHTML = (html: string): DocumentFragment =>
  getCachedTemplate(html).content.cloneNode(true) as DocumentFragment;

const collectBindingTarget = (node: Node, targets: BindingTargets): void => {
  if (node.nodeType === Node.COMMENT_NODE) {
    const marker = (node as Comment).nodeValue;

    if (marker) targets.comments.set(marker, node as Comment);

    return;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return;

  const id = (node as Element).getAttribute(CF_ID_ATTR);

  if (id) targets.elements.set(id, node as HTMLElement);
};

export const indexBindings = (root: Node): BindingTargets => {
  const targets: BindingTargets = { comments: new Map(), elements: new Map() };
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_COMMENT | NodeFilter.SHOW_ELEMENT);

  collectBindingTarget(root, targets);

  while (walker.nextNode()) collectBindingTarget(walker.currentNode, targets);

  return targets;
};

export const indexBindingsInNodes = (nodes: Iterable<Node>): BindingTargets => {
  const targets: BindingTargets = { comments: new Map(), elements: new Map() };

  for (const node of nodes) {
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_COMMENT | NodeFilter.SHOW_ELEMENT);

    collectBindingTarget(node, targets);

    while (walker.nextNode()) collectBindingTarget(walker.currentNode, targets);
  }

  return targets;
};
export const findCommentMarker = (root: Node, marker: string): Comment | null => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_COMMENT);

  while (walker.nextNode()) {
    const comment = walker.currentNode as Comment;

    if (comment.nodeValue === marker) return comment;
  }

  return null;
};

export const isHtmlBindingMarker = (node: Node): boolean =>
  node.nodeType === Node.COMMENT_NODE &&
  ((node as Comment).data === 'html-binding' || (node as Comment).data.startsWith('__h_'));

export const clearAfterMarker = (marker: Comment): void => {
  let next = marker.nextSibling;

  while (next) {
    if (isHtmlBindingMarker(next)) break;

    const toRemove = next;

    next = next.nextSibling;
    toRemove.remove();
  }
};

export const createNodes = (htmlString: string): Node[] => Array.from(parseHTML(htmlString).childNodes);

export const insertNodes = (marker: Comment, nodes: Node[], before: Node | null): void => {
  if (marker.parentNode) {
    for (const node of nodes) marker.parentNode.insertBefore(node, before);
  }
};
