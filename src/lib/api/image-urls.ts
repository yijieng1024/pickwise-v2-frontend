/**
 * Apple's scraped photos come off the spec sheet, where `_large` means "the 1x
 * variant of a thumbnail": measured, `..._large.jpg` is 245×148 (7 KB). Card
 * image areas are ~380×300 CSS px, so those get upscaled ~1.6× at 1x DPR and
 * ~3× on a retina screen, which is the blur. Nothing on the rendering side can
 * fix it — next/image never upscales past a source's intrinsic width, so
 * `quality`/`sizes`/`deviceSizes` are all irrelevant to it.
 *
 * Apple does publish a `_large_2x` twin of every one of these (490×296). All 61
 * distinct Apple URLs in the catalog were checked: every rewrite resolves 200.
 * That makes the swap safe and roughly quadruples the pixels — enough to be
 * sharp at 1x and only mildly soft at 2x.
 *
 * This is a stopgap in front of a backend fix, not the cure. The Apple scraper
 * is reading `/specs/`, so the images are spec-sheet illustrations (`chip_m4`,
 * `ports_back_mx`, `in_the_box`, `size_top`) rather than product photography —
 * whichever lands first becomes a card's hero. Pointing the scraper at the
 * product page's gallery fixes both the resolution and the wrong-picture
 * problem; then this helper can go.
 *
 * ASUS (2400×2400) and Acer (1000–1619px) sources need nothing.
 */

/** `https://www.apple.com/…/name__hash_large.jpg` (optionally cache-busted). */
const APPLE_LARGE = /^(https:\/\/www\.apple\.com\/\S*_large)\.(jpg|png)(\?\S*)?$/;

/** Swaps an Apple spec-sheet thumbnail for its 2x twin; anything else passes through. */
export function hiResImageUrl(url: string): string {
  const match = APPLE_LARGE.exec(url);
  return match ? `${match[1]}_2x.${match[2]}${match[3] ?? ""}` : url;
}

export function hiResImageUrls(urls: string[]): string[] {
  return urls.map(hiResImageUrl);
}
