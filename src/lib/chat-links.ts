/**
 * What kind of link a markdown target in a chat reply is. The chat renders only two
 * kinds and leaves everything else as plain text:
 *
 * - "internal": a path inside PickWise, such as `/laptops/{id}?chip=m5pro-18-20&memory=48gb`.
 *   It starts with exactly one "/": "//host" is another site, and so is "/\host" to a
 *   browser. No scheme, by construction.
 * - "external": an http(s) URL.
 * - null: anything else (`javascript:`, `data:`, `mailto:`, a bare word, empty). Never a link.
 *
 * Pure: the model writes these targets, so this is the one place that decides which of
 * them may become an href.
 */
export type ChatLinkKind = "internal" | "external";

export function chatLinkKind(target: string): ChatLinkKind | null {
  if (/^https?:\/\/\S+$/i.test(target)) return "external";
  if (/^\/(?![/\\])[^\s\\]*$/.test(target)) return "internal";
  return null;
}
