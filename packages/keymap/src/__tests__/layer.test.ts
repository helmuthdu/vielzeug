import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createKeymap } from '../keymap';
import { createKeymapLayer } from '../layer';
import { FakeTarget, makeEvent } from './_fixtures';

describe('createKeymapLayer', () => {
  let target: FakeTarget;

  beforeEach(() => {
    target = new FakeTarget();
  });

  it('layer and parent fire independently when both are mounted', () => {
    const baseHandler = vi.fn();
    const layerHandler = vi.fn();
    const base = createKeymap({ 'ctrl+k': baseHandler });
    const layer = createKeymapLayer(base, { 'ctrl+k': layerHandler });
    const unmountBase = base.mount(target);
    const unmountLayer = layer.mount(target);

    target.dispatch(makeEvent('k', { ctrlKey: true }));
    expect(layerHandler).toHaveBeenCalledOnce();
    expect(baseHandler).toHaveBeenCalledOnce();

    unmountLayer();
    unmountBase();
  });

  it('layer active by default', () => {
    const base = createKeymap({});
    const layer = createKeymapLayer(base, {});

    expect(layer.active).toBe(true);
  });

  it('deactivate() suspends the layer; parent still fires when mounted separately', () => {
    const baseHandler = vi.fn();
    const layerHandler = vi.fn();
    const base = createKeymap({ 'ctrl+k': baseHandler });
    const layer = createKeymapLayer(base, { 'ctrl+k': layerHandler });

    layer.deactivate();
    expect(layer.active).toBe(false);

    const unmountBase = base.mount(target);
    const unmountLayer = layer.mount(target);

    target.dispatch(makeEvent('k', { ctrlKey: true }));
    expect(layerHandler).not.toHaveBeenCalled();
    expect(baseHandler).toHaveBeenCalledOnce();

    unmountLayer();
    unmountBase();
  });

  it('activate() re-enables the layer', () => {
    const layerHandler = vi.fn();
    const base = createKeymap({});
    const layer = createKeymapLayer(base, { 'ctrl+k': layerHandler });
    const unmount = layer.mount(target);

    layer.deactivate();
    layer.activate();
    expect(layer.active).toBe(true);

    target.dispatch(makeEvent('k', { ctrlKey: true }));
    expect(layerHandler).toHaveBeenCalledOnce();

    unmount();
  });

  it('bind() adds shortcut to layer', () => {
    const handler = vi.fn();
    const base = createKeymap({});
    const layer = createKeymapLayer(base, {});
    const unmount = layer.mount(target);

    layer.bind('ctrl+z', handler);
    target.dispatch(makeEvent('z', { ctrlKey: true }));
    expect(handler).toHaveBeenCalledOnce();

    unmount();
  });

  it('unbind() removes shortcut from layer', () => {
    const handler = vi.fn();
    const base = createKeymap({});
    const layer = createKeymapLayer(base, { 'ctrl+z': handler });
    const unmount = layer.mount(target);

    layer.unbind('ctrl+z');
    target.dispatch(makeEvent('z', { ctrlKey: true }));
    expect(handler).not.toHaveBeenCalled();

    unmount();
  });

  it('layer-only shortcut fires without mounting parent', () => {
    const layerHandler = vi.fn();
    const base = createKeymap({});
    const unmount = createKeymapLayer(base, { 'ctrl+k': layerHandler }).mount(target);

    target.dispatch(makeEvent('k', { ctrlKey: true }));
    expect(layerHandler).toHaveBeenCalledOnce();

    unmount();
  });

  it('respects global when() from layer options', () => {
    const handler = vi.fn();
    let active = false;
    const base = createKeymap({});
    const layer = createKeymapLayer(base, { 'ctrl+k': handler }, { when: () => active });
    const unmount = layer.mount(target);

    target.dispatch(makeEvent('k', { ctrlKey: true }));
    expect(handler).not.toHaveBeenCalled();

    active = true;
    target.dispatch(makeEvent('k', { ctrlKey: true }));
    expect(handler).toHaveBeenCalledOnce();

    unmount();
  });

  it('dispose() only tears down the layer — parent remains functional', () => {
    const baseHandler = vi.fn();
    const layerHandler = vi.fn();
    const base = createKeymap({ 'ctrl+k': baseHandler });
    const layer = createKeymapLayer(base, { 'ctrl+k': layerHandler });
    const unmountBase = base.mount(target);

    layer.mount(target);
    layer.dispose();

    target.dispatch(makeEvent('k', { ctrlKey: true }));
    expect(layerHandler).not.toHaveBeenCalled();
    expect(baseHandler).toHaveBeenCalledOnce();

    unmountBase();
  });

  it('[Symbol.dispose]() disposes the layer', () => {
    const layerHandler = vi.fn();
    const base = createKeymap({});
    const layer = createKeymapLayer(base, { 'ctrl+k': layerHandler });
    const unmount = layer.mount(target);

    layer[Symbol.dispose]();
    target.dispatch(makeEvent('k', { ctrlKey: true }));
    expect(layerHandler).not.toHaveBeenCalled();

    unmount();
  });

  it('layer.parent returns the parent keymap reference', () => {
    const base = createKeymap({});
    const layer = createKeymapLayer(base, {});

    expect(layer.parent).toBe(base);
  });

  it('listBindings() returns layer bindings only (not parent bindings)', () => {
    const base = createKeymap({ 'ctrl+s': vi.fn() });
    const layer = createKeymapLayer(base, { 'ctrl+k': vi.fn() });

    expect(layer.listBindings()).toHaveLength(1);
    expect(layer.listBindings()[0].shortcut[0]).toEqual({ key: 'k', modifiers: new Set(['ctrl']) });
  });

  it('listBindings() reflects bind() calls on the layer', () => {
    const layer = createKeymapLayer(createKeymap({}), {});

    expect(layer.listBindings()).toHaveLength(0);
    layer.bind('ctrl+k', vi.fn());
    expect(layer.listBindings()).toHaveLength(1);
  });

  it('mounting parent separately fires it exactly once (no double-listener from layer)', () => {
    const baseHandler = vi.fn();
    const base = createKeymap({ 'ctrl+k': baseHandler });
    const layer = createKeymapLayer(base, {});
    const unmountBase = base.mount(target);
    const unmountLayer = layer.mount(target);

    target.dispatch(makeEvent('k', { ctrlKey: true }));
    expect(baseHandler).toHaveBeenCalledTimes(1);

    unmountLayer();
    unmountBase();
  });
});
