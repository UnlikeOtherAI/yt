const namedEntities: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: "\""
};

const entityPattern = /&(#x[0-9a-f]+|#\d+|[a-z]+);/giu;

const decodeMatch = (match: string, inner: string): string => {
  const lower = inner.toLowerCase();

  if (lower.startsWith("#x")) {
    const code = Number.parseInt(lower.slice(2), 16);
    return Number.isNaN(code) ? match : String.fromCodePoint(code);
  }

  if (lower.startsWith("#")) {
    const code = Number.parseInt(lower.slice(1), 10);
    return Number.isNaN(code) ? match : String.fromCodePoint(code);
  }

  return namedEntities[lower] ?? match;
};

export const decodeHtmlEntities = (input: string): string =>
  input.replace(entityPattern, decodeMatch);
