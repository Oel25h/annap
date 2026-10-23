/**
 * Binds every one- and two-letter word to the word after it with a no-break
 * space, so a line of display, lead, caption or subtitle copy never ends on
 * "a", "I", "to", "σε" or "το". Plain text only, never HTML.
 */
const SHORT_WORD = /(?<=^|[\s(«"“‘—–-])([\p{L}\p{N}&]{1,2})[ \t]+(?=\S)/gu;

export function nb(text: string): string {
  return text.replace(SHORT_WORD, "$1 ");
}

/**
 * The drop cap swallows a one-letter first word ("Η ιστορία", "I learned"):
 * the space after it opens the line beside the cap and collapses, so the cap
 * reads as part of the next word. Keep that one space as a no-break space.
 * Sanitised HTML in, HTML out; only the opening paragraph is touched.
 */
const CAP_WORD = /^(\s*<p\b[^>]*>\s*[«"“‘(]?[\p{L}\p{N}])[ \t\r\n]+(?=[^\s<])/u;

export function keepCapSpace(html: string): string {
  return html.replace(CAP_WORD, "$1 ");
}
