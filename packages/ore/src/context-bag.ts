/**
 * Factory for the SetupContextBag — shared between BaseElement and renderHook.
 * Keeps the real component lifecycle and the test harness in sync automatically.
 */

import type { SetupContextBag } from './component-types';
import type { InjectionKey } from './context';

import { createAriaFn } from './aria';
import { inject, provideOnElement } from './context';
import { createBind } from './host-bind';
import { effect, onCleanup, onElement, onEvent, onMounted, type OnMountedCallback } from './runtime';
import { type ComponentSlots, createSlots } from './slots';
import { createEmitFn } from './utils/emit';

export type ContextBagInit = {
  el: HTMLElement;
  mountCallbacks: OnMountedCallback[];
};

export const createContextBag = (el: HTMLElement): SetupContextBag<Record<string, never>, string> => {
  const slots = createSlots(el) as ComponentSlots<string>;

  const bind = createBind(el);

  return {
    aria: createAriaFn(),
    bind,
    el,
    emit: createEmitFn(el),
    inject,
    onCleanup,
    onElement,
    onEvent,
    onMounted,
    provide: <T>(key: InjectionKey<T>, value: T) => provideOnElement(el, key, value),
    slots,
    watch: effect,
  };
};
