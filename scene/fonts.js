// Canvas type faces — match the HTML chrome (loaded in index.html).
 // Display for plaques / landmark numerals; mono for crawl / technical marks.

export const FONT_DISPLAY = '"Barlow Condensed", sans-serif';
export const FONT_MONO = '"IBM Plex Mono", ui-monospace, monospace';

export function useDisplay(p, size) {
  p.textFont(FONT_DISPLAY);
  if (size != null) p.textSize(size);
}

export function useMono(p, size) {
  p.textFont(FONT_MONO);
  if (size != null) p.textSize(size);
}
