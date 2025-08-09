// Utility for slug normalization
// Rules:
// - Lowercase the canonical title.
// - Replace any sequence of non-alphanumeric characters with a single hyphen.
// - Trim leading/trailing hyphens.
// - Unicode NFC normalize.
export function slugify(input: string): string {
  if (!input) return "";
  // Normalize Unicode (NFC)
  const normalized = input.normalize("NFC");
  // Lowercase and replace non-alphanumeric sequences with hyphen
  const slug = normalized
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug;
}

export function extractBracketLinks(text: string): Array<{ text: string; slug: string }>{
  const results: Array<{ text: string; slug: string }> = [];
  if (!text) return results;
  const regex = /\[\[([^\[\]]+)\]\]/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const raw = match[1].trim();
    if (!raw) continue;
    results.push({ text: raw, slug: slugify(raw) });
  }
  return results;
}
