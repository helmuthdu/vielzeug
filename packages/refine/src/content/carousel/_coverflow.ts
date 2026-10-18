export function syncCoverflow(
  slides: HTMLElement[],
  current: number,
  options: { extent: number; horizontal: boolean; loop: boolean; rtl: boolean; size: number; spacing: number },
): void {
  const { extent, horizontal, loop, rtl, size, spacing } = options;
  const capacity = size > 0 && spacing > 0 ? Math.max(0, Math.floor((extent - size) / (2 * spacing))) : 0;

  slides.forEach((slide, index) => {
    let offset = index - current;

    if (loop) {
      const half = slides.length / 2;

      if (offset > half) offset -= slides.length;
      if (offset < -half) offset += slides.length;
    }

    const distance = Math.abs(offset);
    const direction = horizontal && rtl ? -1 : 1;
    // Approach the depth limit smoothly so wide fans have no abrupt outer tier.
    const depth = 4 * (1 - 0.75 ** distance);
    const translate = offset * spacing * direction;
    const angle = Math.sign(offset) * depth * 12 * direction;
    const transform = horizontal
      ? `translate3d(${translate}px, 0, ${-depth * size * 0.12}px) rotateY(${-angle}deg)`
      : `translate3d(0, ${translate}px, ${-depth * size * 0.12}px) rotateX(${angle}deg)`;

    slide.toggleAttribute('data-coverflow-visible', distance <= capacity);
    slide.style.setProperty('--_coverflow-transform', `${transform} scale(${0.5 + 0.5 * 0.84 ** distance})`);
    slide.style.setProperty('--_coverflow-order', String(slides.length - distance));
  });
}

export function clearCoverflow(slide: HTMLElement): void {
  slide.removeAttribute('data-coverflow-visible');
  slide.style.removeProperty('--_coverflow-transform');
  slide.style.removeProperty('--_coverflow-order');
  slide.shadowRoot?.querySelector('.content')?.removeAttribute('inert');
}
