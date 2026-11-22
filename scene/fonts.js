// Canvas type faces — match the HTML chrome (loaded in index.html).
 // Display for plaques / landmark numerals; mono for crawl / technical marks.

// Bare family names only: p5 wraps any name containing a space in quotes, so a CSS list such as
// '"Barlow Condensed", sans-serif' becomes an invalid canvas font and the context silently keeps its
// previous face and size.
export const FONT_DISPLAY = 'Barlow Condensed';
export const FONT_MONO = 'IBM Plex Mono';

export function useDisplay(p, size) {
  p.textFont(FONT_DISPLAY);
  if (size != null) p.textSize(size);
}

export function useMono(p, size) {
  p.textFont(FONT_MONO);
  if (size != null) p.textSize(size);
}
