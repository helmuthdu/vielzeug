/** Shared options for tabula parsers and serializers. */
export type TabulaOptions = {
  /** Field delimiter; defaults to auto-detection among `,`, `;`, and tab from the first line. */
  delimiter?: string;
};

/** Parser options for the text and stream readers. */
export type TabulaParseOptions = TabulaOptions & {
  /** Skip blank lines instead of surfacing them as empty rows (default `true`). */
  skipEmptyLines?: boolean;
};

/** Options for reading a header row into records. */
export type TabulaRecordOptions = TabulaParseOptions & {
  /** Header names to use instead of the first row; the first row is then data. */
  headers?: readonly string[];
};

/** Serializer options. */
export type TabulaSerializeOptions = TabulaOptions & {
  /** Quote every field regardless of need (default `false`). */
  quoteAll?: boolean;
  /** Line terminator (default RFC 4180 `\r\n`). */
  newline?: string;
};

/** Options for record serialization; columns default to every record's keys in first-seen order. */
export type TabulaRecordSerializeOptions = TabulaSerializeOptions & {
  /** Explicit column order. */
  columns?: readonly string[];
};
