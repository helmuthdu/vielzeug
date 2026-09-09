import { animateEach, captureLayout, type LayoutTransition } from '../src/index.js';

const buttons = [document.createElement('button')];
const group = animateEach(buttons, (button) => {
  const disabled: boolean = button.disabled;
  return [{ opacity: disabled ? 0.5 : 1 }];
});
const transition: LayoutTransition<HTMLButtonElement> = captureLayout(buttons, {
  getKey: (button) => button.dataset.id ?? '',
});

transition.animate({ elements: buttons });
void group;
