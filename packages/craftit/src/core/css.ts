export type CSSResult = {
  content: string;
  toString(): string;
};

const cssResultToString = function (this: CSSResult): string {
  return this.content;
};

export const css = (strings: TemplateStringsArray, ...values: unknown[]): CSSResult => {
  let content = '';

  for (let i = 0; i < strings.length; i++) {
    content += strings[i];

    if (i < values.length) {
      const v = values[i];

      content += v && typeof v === 'object' && 'content' in v ? (v as CSSResult).content : (v ?? '');
    }
  }

  return { content: content.trim(), toString: cssResultToString };
};
