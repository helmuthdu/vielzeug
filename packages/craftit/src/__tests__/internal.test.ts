import { html, ref } from '../index';
import { mount } from '../test';

describe('core/internal.ts', () => {
  describe('ref()', () => {
    it('captures the element instance after the component mounts', async () => {
      let capturedRef!: ReturnType<typeof ref<HTMLDivElement>>;

      await mount(() => {
        capturedRef = ref<HTMLDivElement>();

        return html`<div ref=${capturedRef}></div>`;
      });

      expect(capturedRef.value).toBeInstanceOf(HTMLDivElement);
    });

    it('value is null at setup time, before the DOM is populated', async () => {
      let refValueAtSetupTime: HTMLDivElement | null = undefined as any;

      await mount(() => {
        const divRef = ref<HTMLDivElement>();

        // Capture during setup before shadow DOM is rendered.
        refValueAtSetupTime = divRef.value;

        return html`<div ref=${divRef}></div>`;
      });

      expect(refValueAtSetupTime).toBeNull();
    });

    it('supports multiple independent refs in the same component', async () => {
      let divRef!: ReturnType<typeof ref<HTMLDivElement>>;
      let spanRef!: ReturnType<typeof ref<HTMLSpanElement>>;

      await mount(() => {
        divRef = ref<HTMLDivElement>();
        spanRef = ref<HTMLSpanElement>();

        return html`<div ref=${divRef}>Div</div>
          <span ref=${spanRef}>Span</span>`;
      });

      expect(divRef.value).toBeInstanceOf(HTMLDivElement);
      expect(spanRef.value).toBeInstanceOf(HTMLSpanElement);
    });

    it('callback ref is invoked with the element on mount', async () => {
      const calls: Array<HTMLElement | null> = [];

      await mount(() => html`<div ref=${(el: HTMLDivElement | null) => calls.push(el)}>Test</div>`);

      expect(calls).toHaveLength(1);
      expect(calls[0]).toBeInstanceOf(HTMLDivElement);
    });

    it('callback ref is invoked with null when the component unmounts', async () => {
      const calls: Array<HTMLElement | null> = [];

      const fixture = await mount(() => html`<div ref=${(el: HTMLDivElement | null) => calls.push(el)}>Test</div>`);

      fixture.destroy();

      expect(calls).toHaveLength(2);
      expect(calls[1]).toBeNull();
    });
  });
});
