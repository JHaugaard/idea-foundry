/**
 * Utilities for tag parsing and normalization
 */

/**
 * Extracts hashtags from text using regex
 * Matches #word but excludes #123 (numbers only)
 */
export function parseHashtags(text: string): string[] {
  if (!text) return [];
  
  // Regex that matches #word but not standalone numbers
  const hashtagRegex = /#([a-zA-Z][a-zA-Z0-9_-]*)/g;
  const matches = text.match(hashtagRegex);
  
  if (!matches) return [];
  
  // Extract tags without the # symbol and normalize them
  return matches
    .map(match => match.slice(1)) // Remove #
    .map(tag => normalizeTag(tag))
    .filter((tag, index, arr) => tag && arr.indexOf(tag) === index); // Remove duplicates and empty tags
}

/**
 * Normalizes a tag according to the same rules as TagInput
 */
export function normalizeTag(tag: string): string {
  if (!tag) return '';
  
  return tag
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/[^a-z0-9-]/g, '') // Remove non-alphanumeric except hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    .slice(0, 30); // Limit to 30 characters
}

/**
 * Merges multiple tag arrays, removing duplicates
 */
export function mergeTags(...tagArrays: (string[] | null | undefined)[]): string[] {
  const allTags = tagArrays
    .filter(Boolean)
    .flat()
    .filter(Boolean)
    .map(tag => normalizeTag(tag))
    .filter(Boolean);
  
  return Array.from(new Set(allTags));
}